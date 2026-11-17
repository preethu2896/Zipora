import { Buffer } from 'node:buffer';
import { BookingError, maxLogoBytes, validateSubmission, verifyWebhook } from './submission.mjs';

const bookingIdPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const holdDuration = 30 * 60_000;

async function readBody(request, limit) {
  const reader = request.body?.getReader();
  const bytes = new Uint8Array(limit);
  let length = 0;
  try {
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value.length > limit - length) {
          await reader.cancel();
          throw new BookingError(413, 'Request is too large.');
        }
        bytes.set(value, length);
        length += value.length;
      }
    }
    return bytes.subarray(0, length);
  } finally {
    reader?.releaseLock();
  }
}

function checkoutLink(env, id) {
  const url = new URL(env.DODO_PAYMENT_LINK);
  const expected = env.SPONSOR_MODE === 'live' ? 'https://checkout.dodopayments.com' : 'https://test.checkout.dodopayments.com';
  const missingPaymentKey = env.SPONSOR_MODE === 'live' && !env.DODO_LIVE_API_KEY;
  const missingEmailSettings = !env.RESEND_API_KEY || !env.SPONSOR_EMAIL_FROM || !env.SPONSOR_EMAIL_TO;
  const testSenderInLiveMode = env.SPONSOR_MODE === 'live' && /@resend\.dev\b/i.test(env.SPONSOR_EMAIL_FROM);
  if (url.origin !== expected || url.pathname !== `/buy/${env.DODO_PRODUCT_ID}`
      || !env.DODO_WEBHOOK_SECRET || missingPaymentKey || missingEmailSettings || testSenderInLiveMode) {
    throw new BookingError(503, 'Sponsor checkout is temporarily unavailable.');
  }
  url.searchParams.set('quantity', '1');
  url.searchParams.delete('paymentCurrency');
  url.searchParams.set('metadata_zipora_booking_id', id);
  url.searchParams.set('redirect_url', new URL('/return', env.SPONSOR_RETURN_ORIGIN).href);
  return url.href;
}

async function expireBookings(db, now) {
  await db.prepare(`UPDATE bookings
    SET status = CASE WHEN status = 'held' THEN 'expired' ELSE 'ended' END
    WHERE status IN ('held', 'published') AND expires <= ?`).bind(now).run();
}

async function sendNotice(env, booking) {
  if (booking.notified) return;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `zipora-sponsor-${booking.id}-${booking.payment_id}`,
    },
    body: JSON.stringify({
      from: env.SPONSOR_EMAIL_FROM,
      to: [env.SPONSOR_EMAIL_TO],
      subject: `Zipora sponsorship: Frame ${booking.frame} ${booking.status === 'paid' ? 'paid' : 'needs review'}`,
      text: [
        `Booking: ${booking.id}`, `Frame: ${booking.frame}`, `Brand: ${booking.brand}`,
        `Tagline: ${booking.tagline}`, `Website: ${booking.link}`, `Sponsor email: ${booking.email}`,
        `Payment: ${booking.payment_id}`, `Notes: ${booking.notes || 'None'}`,
        booking.status === 'paid' ? 'Review the logo and website before publishing.' : 'Check the payment and placement before publishing.',
      ].join('\n'),
      attachments: [{filename: `sponsor-logo.${booking.extension}`, content: booking.logo}],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new BookingError(502, 'The sponsor notification could not be sent.');
  await env.DB.prepare('UPDATE bookings SET notified = ? WHERE id = ? AND payment_id = ?')
    .bind(Date.now(), booking.id, booking.payment_id).run();
}

async function verifyLivePayment(env, event) {
  const id = event?.metadata?.zipora_booking_id;
  const paymentId = event?.payment_id;
  if (typeof id !== 'string' || !bookingIdPattern.test(id) || typeof paymentId !== 'string' || !/^pay_[a-zA-Z0-9]+$/.test(paymentId)) return null;
  if (!await env.DB.prepare('SELECT 1 FROM bookings WHERE id = ?').bind(id).first()) return null;
  if (!env.DODO_LIVE_API_KEY) throw new BookingError(503, 'Live payment verification is not configured.');
  const response = await fetch(`https://live.dodopayments.com/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${env.DODO_LIVE_API_KEY}` },
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new BookingError(502, 'Dodo could not verify the payment.');
  const payment = await response.json();
  if (payment.payment_id !== paymentId || payment.metadata?.zipora_booking_id !== id) return null;
  if (payment.status !== 'succeeded') throw new BookingError(502, 'Dodo has not confirmed the payment yet.');
  if (payment.currency !== 'USD') {
    const linesResponse = await fetch(`https://live.dodopayments.com/payments/${encodeURIComponent(paymentId)}/line-items`, {
      headers: { Authorization: `Bearer ${env.DODO_LIVE_API_KEY}` },
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    if (!linesResponse.ok) throw new BookingError(502, 'Dodo could not verify the original purchase amount.');
    const lines = await linesResponse.json();
    const validLines = lines.currency === 'USD' && Array.isArray(lines.items) && lines.items.length > 0
      && lines.items.every(item => Number.isSafeInteger(item.amount) && item.amount > 0);
    // With no currency override, Dodo returns line amounts in the settlement currency.
    // These amounts already include tax, so compare their sum with the $30 total.
    payment.verifiedUsdTotal = validLines ? lines.items.reduce((sum, item) => sum + item.amount, 0) : null;
  }
  return payment;
}

async function recordPayment(env, data) {
  const id = data?.metadata?.zipora_booking_id;
  if (typeof id !== 'string' || !bookingIdPattern.test(id) || data.status !== 'succeeded' || typeof data.payment_id !== 'string' || !data.payment_id) return;
  const cart = data.product_cart;
  if (cart?.length !== 1 || cart[0].product_id !== env.DODO_PRODUCT_ID || cart[0].quantity !== 1) return;
  await env.DB.prepare(`UPDATE OR IGNORE bookings
    SET payment_id = ?, status = CASE WHEN status = 'held' AND expires > ? AND ? = 1 THEN 'paid' ELSE 'review' END
    WHERE id = ? AND payment_id IS NULL AND status IN ('held', 'expired')`)
    .bind(data.payment_id, Date.now(), Number(data.currency === 'USD' ? data.total_amount === 3000 : data.verifiedUsdTotal === 3000), id).run();
  const booking = await env.DB.prepare('SELECT * FROM bookings WHERE id = ? AND payment_id = ?').bind(id, data.payment_id).first();
  if (booking) await sendNotice(env, booking);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const origin = request.headers.get('Origin');
    const headers = new Headers({'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', Vary:'Origin'});
    if (origin === env.SPONSOR_WEB_ORIGIN) headers.set('Access-Control-Allow-Origin', origin);
    function json(data, status = 200) {
      return Response.json(data, { status, headers });
    }

    try {
      if (request.method === 'OPTIONS' && pathname === '/checkout' && origin === env.SPONSOR_WEB_ORIGIN) {
        headers.set('Access-Control-Allow-Methods', 'POST');
        headers.set('Access-Control-Allow-Headers', 'Content-Type');
        return new Response(null, { status:204, headers });
      }

      if (request.method === 'GET' && pathname === '/return') {
        headers.set('Location', new URL('/advertise/?checkout=returned', env.SPONSOR_WEB_ORIGIN).href);
        headers.set('Referrer-Policy', 'no-referrer');
        return new Response(null, { status:303, headers });
      }

      if (request.method === 'GET' && pathname === '/frames') {
        const { results } = await env.DB.prepare("SELECT id, frame, status, brand, tagline, link FROM bookings WHERE status = 'paid' OR (status IN ('held','published') AND expires > ?) ORDER BY frame").bind(Date.now()).all();
        return json(results.map(row => row.status === 'published'
          ? {number:row.frame, state:'published', brand:row.brand, tagline:row.tagline, link:row.link, logo:`/logos/${row.id}`}
          : {number:row.frame, state:row.status}));
      }

      if (request.method === 'POST' && pathname === '/checkout') {
        if (origin !== env.SPONSOR_WEB_ORIGIN) throw new BookingError(403, 'Checkout must start on Zipora.');
        const contentType = request.headers.get('Content-Type');
        if (!contentType?.startsWith('multipart/form-data;')) throw new BookingError(415, 'Submit the sponsor form.');
        const bytes = await readBody(request, maxLogoBytes + 32 * 1024);
        const form = await new Response(bytes, { headers:{'Content-Type':contentType} }).formData()
          .catch(() => { throw new BookingError(400, 'Could not read the sponsor form.'); });
        const data = await validateSubmission(form);
        const id = crypto.randomUUID();
        const checkoutUrl = checkoutLink(env, id);
        const now = Date.now();
        await expireBookings(env.DB, now);
        const result = await env.DB.prepare(`INSERT OR IGNORE INTO bookings
          (id,frame,brand,tagline,link,email,notes,logo,extension,expires) VALUES (?,?,?,?,?,?,?,?,?,?)`)
          .bind(id, data.frame, data.brand, data.tagline, data.link, data.email, data.notes,
            data.bytes.toString('base64'), data.extension, now + holdDuration).run();
        if (result.meta.changes !== 1) throw new BookingError(409, 'That frame is already reserved.');
        return json({ checkoutUrl, bookingId:id }, 201);
      }

      const [, route, id, extra] = pathname.split('/');
      if (request.method === 'GET' && bookingIdPattern.test(id ?? '') && extra === undefined) {
        if (route === 'checkout-status') {
          const row = await env.DB.prepare('SELECT status, expires FROM bookings WHERE id = ?').bind(id).first();
          if (!row) throw new BookingError(404, 'Booking unavailable.');
          let status = 'unpaid';
          if (['paid','published','ended'].includes(row.status)) status = 'paid';
          if (['review','refunded'].includes(row.status)) status = 'review';
          if (row.status === 'held' && row.expires > Date.now()) status = 'pending';
          return json({ status });
        }
        if (route === 'logos') {
          const row = await env.DB.prepare("SELECT logo, extension FROM bookings WHERE id = ? AND status = 'published' AND expires > ?").bind(id, Date.now()).first();
          if (!row) throw new BookingError(404, 'Logo unavailable.');
          headers.set('Content-Type', `image/${row.extension === 'jpg' ? 'jpeg' : row.extension}`);
          return new Response(Buffer.from(row.logo, 'base64'), {headers});
        }
      }

      if (request.method === 'POST' && pathname === '/webhooks/dodo') {
        const body = Buffer.from(await readBody(request, 256 * 1024));
        if (!env.DODO_WEBHOOK_SECRET || !verifyWebhook(body, Object.fromEntries(request.headers), env.DODO_WEBHOOK_SECRET)) {
          throw new BookingError(401, 'Invalid webhook signature.');
        }
        let event;
        try { event = JSON.parse(body.toString('utf8')); } catch { throw new BookingError(400, 'Invalid webhook payload.'); }
        if (event?.type === 'payment.succeeded') {
          const payment = env.SPONSOR_MODE === 'live' ? await verifyLivePayment(env, event.data) : event.data;
          if (payment) await recordPayment(env, payment);
        }
        return json({ received:true });
      }

      throw new BookingError(404, 'Route unavailable.');
    } catch (error) {
      if (error instanceof BookingError) return json({ error:error.message }, error.status);
      return json({ error:'Sponsor service temporarily unavailable.' }, 503);
    }
  },
};

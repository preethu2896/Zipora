import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import worker from './worker.mjs';

test('Dodo link reserves a frame and only a verified payment sends the logo email', async t => {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  sqlite.exec(readFileSync(new URL('./worker-schema.sql', import.meta.url), 'utf8'));
  const DB = {
    prepare(sql) {
      const stmt = sqlite.prepare(sql);
      return { bind: (...params) => ({
        run: async () => ({meta:{changes:stmt.run(...params).changes}}),
        first: async () => stmt.get(...params),
        all: async () => ({results:stmt.all(...params)}),
      }) };
    },
  };
  const key = Buffer.from('fixture-signature-key');
  const env = {
    DB, SPONSOR_MODE:'live', DODO_PRODUCT_ID:'pdt_fixture', SPONSOR_WEB_ORIGIN:'https://www.zipora.online',
    SPONSOR_RETURN_ORIGIN:'https://zipora-sponsors.example.workers.dev',
    DODO_PAYMENT_LINK:'https://checkout.dodopayments.com/buy/pdt_fixture?quantity=1',
    DODO_LIVE_API_KEY:'fixture-read-key', DODO_WEBHOOK_SECRET:'whsec_' + key.toString('base64'), RESEND_API_KEY:'fixture',
    SPONSOR_EMAIL_FROM:'sponsors@mail.zipora.online', SPONSOR_EMAIL_TO:'contact@zipora.online',
  };
  const emails = [];
  let verifiedPayment;
  let lookups = 0;
  let settlementLines = {currency:"USD",items:[{amount:3000,tax:458}]};
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url === 'https://live.dodopayments.com/payments/pay_fixture/line-items') {
      return Response.json(settlementLines);
    }
    if (url === 'https://live.dodopayments.com/payments/pay_fixture') {
      assert.equal(options.headers.Authorization, 'Bearer fixture-read-key');
      lookups++;
      return Response.json(verifiedPayment ?? {}, {status:verifiedPayment ? 200 : 404});
    }
    assert.equal(url, 'https://api.resend.com/emails');
    emails.push(JSON.parse(options.body));
    return Response.json({id:'notice'});
  });
  const call = (path, init) => worker.fetch(new Request(env.SPONSOR_RETURN_ORIGIN + path, init), env);
  function checkout() {
    const form = new FormData();
    for (const [name,value] of Object.entries({frame:'1',brand:'Studio Test',tagline:'Design tools',link:'https://example.com/',email:'sponsor@example.com'})) form.set(name,value);
    form.set('logo',new File([Buffer.from('89504e470d0a1a0a','hex')],'logo.png',{type:'image/png'}));
    return call('/checkout',{method:'POST',headers:{Origin:env.SPONSOR_WEB_ORIGIN},body:form});
  }

  const initial = await checkout();
  assert.equal(initial.status,201);
  const { bookingId, checkoutUrl } = await initial.json();
  const dodo = new URL(checkoutUrl);
  assert.equal(dodo.searchParams.has('paymentCurrency'),false);
  assert.equal(dodo.searchParams.get('metadata_zipora_booking_id'),bookingId);
  assert.equal(dodo.searchParams.get('redirect_url'),env.SPONSOR_RETURN_ORIGIN+'/return');
  assert.equal((await checkout()).status,409);

  const redirect = await call('/return?status=succeeded&email=private@example.com');
  assert.equal(redirect.headers.get('Location'),env.SPONSOR_WEB_ORIGIN+'/advertise/?checkout=returned');
  const status = async () => (await (await call('/checkout-status/'+bookingId)).json()).status;
  assert.equal(await status(),'pending');
  assert.equal(emails.length,0);

  const hook = (overrides, signed = true) => {
    const body = JSON.stringify({type:'payment.succeeded',data:{
      payment_id:'pay_fixture',status:'succeeded',metadata:{zipora_booking_id:bookingId},currency:'USD',total_amount:3000,
      product_cart:[{product_id:env.DODO_PRODUCT_ID,quantity:1}],...overrides,
    }});
    const stamp = Math.floor(Date.now()/1000);
    const signature = createHmac('sha256',key).update(`event.${stamp}.`).update(body).digest('base64');
    return call('/webhooks/dodo',{method:'POST',body,headers:{
      'webhook-id':'event','webhook-timestamp':String(stamp),'webhook-signature':signed?`v1,${signature}`:'v1,invalid',
    }});
  };
  assert.equal((await hook({},false)).status,401);
  assert.equal(lookups,0);
  assert.equal((await hook({})).status,200);
  assert.equal(lookups,1);
  verifiedPayment = {
    payment_id:'pay_fixture',status:'succeeded',metadata:{zipora_booking_id:bookingId},
    currency:'USD',total_amount:3000,product_cart:[{product_id:'wrong',quantity:1}],
  };
  await hook({});
  assert.equal(await status(),'pending');
  assert.equal(emails.length,0);

  verifiedPayment.product_cart[0].product_id = env.DODO_PRODUCT_ID;
  assert.equal((await hook({})).status,200);
  assert.equal((await hook({})).status,200);
  assert.equal(await status(),'paid');
  assert.equal(emails.length,1);
  assert.match(emails[0].text,/https:\/\/example.com\//);
  assert.equal(emails[0].attachments[0].content,'iVBORw0KGgo=');
  assert.deepEqual(await (await call('/frames')).json(),[{number:1,state:'paid'}]);
  assert.equal((await call('/logos/'+bookingId)).status,404);
  sqlite.prepare("UPDATE bookings SET status = 'published' WHERE id = ?").run(bookingId);
  assert.equal((await call('/logos/'+bookingId)).status,200);
  for (const scenario of [
    {currency:'INR',amount:3000,expected:'paid'},
    {currency:'EUR',amount:3000,expected:'paid'},
    {currency:'INR',amount:2900,expected:'review'},
    {currency:'INR',amount:3000,lineCurrency:'INR',expected:'review'},
    {currency:'USD',amount:2900,expected:'review'},
  ]) {
    sqlite.prepare("UPDATE bookings SET status='held',payment_id=NULL,notified=NULL WHERE id=?").run(bookingId);
    verifiedPayment.currency = scenario.currency;
    verifiedPayment.total_amount = scenario.currency === 'USD' ? scenario.amount : 291729;
    settlementLines = {currency:scenario.lineCurrency ?? 'USD',items:[{amount:scenario.amount,tax:458}]};
    assert.equal((await hook({})).status,200);
    assert.equal(await status(),scenario.expected,JSON.stringify(scenario));
  }
});

'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useBlobUrl } from '@/components/use-blob-url';
import { contactEmail } from '@/lib/site-url';
import { sponsorFrames } from '@/lib/sponsors';
import styles from './advertise.module.css';

type Field = 'frame' | 'brand' | 'tagline' | 'link' | 'logo' | 'email';
const logoTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

export function SponsorForm() {
  const [frame, setFrame] = useState<number>();
  const [brand, setBrand] = useState('');
  const [tagline, setTagline] = useState('');
  const [logo, setLogo] = useState<File>();
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [mailto, setMailto] = useState('');
  const preview = useBlobUrl(logo);

  useEffect(() => {
    const parameter = new URLSearchParams(window.location.search).get('frame');
    const selection = sponsorFrames.find(item => !item.taken && String(item.number) === parameter);
    setFrame(selection?.number);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const link = String(data.get('link') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const next: typeof errors = {};
    if (!frame) next.frame = 'Pick an available frame.';
    if (!brand.trim() || brand.length > 16) next.brand = 'Enter a brand name of 1–16 characters.';
    if (!tagline.trim() || tagline.length > 25) next.tagline = 'Enter a tagline of 1–25 characters.';
    if (!link.startsWith('https://') || !URL.canParse(link)) next.link = 'Enter a valid link starting with https://.';
    if (!logo) next.logo = errors.logo || 'Choose a PNG, JPG, WebP or SVG logo.';
    const emailInput = form.elements.namedItem('email') as HTMLInputElement;
    if (!email || !emailInput.validity.valid) next.email = 'Enter a valid email address.';
    setErrors(next);
    if (Object.keys(next).length) return;
    const subject = `Zipora sponsorship: frame ${frame} — ${brand.trim()}`;
    const body = [`Frame: ${frame}`, `Brand: ${brand.trim()}`, `Tagline: ${tagline.trim()}`,
      `Link: ${link}`, `Email: ${email}`, String(data.get('notes') ?? ''), 'Please attach your logo before sending.'].join('\r\n');
    setMailto(`mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  }

  function error(field: Field) {
    return errors[field] && <p id={`sponsor-${field}-error`} className={styles.error} role="alert">{errors[field]}</p>;
  }

  return <form noValidate onSubmit={submit} onChange={() => setMailto('')} className={styles.form}>
    {frame && <p className={styles.selection}>Frame {frame} — $30 a month</p>}
    <fieldset aria-describedby={errors.frame ? 'sponsor-frame-error' : undefined}>
      <legend>Pick a frame</legend>
      <div className={styles.frames}>{sponsorFrames.map(item =>
        <button key={item.number} type="button" disabled={item.taken} aria-pressed={frame === item.number}
          onClick={() => { setFrame(item.number); setMailto(''); setErrors(previous => ({ ...previous, frame: undefined })); }}>
          <strong>{String(item.number).padStart(2, '0')}</strong>
          <span>{item.taken ? 'Taken' : 'Free'}</span>
          {item.featured && <small>Featured</small>}
        </button>
      )}</div>
      {error('frame')}
    </fieldset>
    <div><label htmlFor="sponsor-brand">Brand name <span>{brand.length}/16</span></label>
      <input id="sponsor-brand" name="brand" required maxLength={16} value={brand} onChange={event => setBrand(event.target.value)}
        aria-invalid={!!errors.brand} aria-describedby={errors.brand ? 'sponsor-brand-error' : undefined}/>{error('brand')}</div>
    <div><label htmlFor="sponsor-tagline">Tagline <span>{tagline.length}/25</span></label>
      <input id="sponsor-tagline" name="tagline" required maxLength={25} value={tagline} onChange={event => setTagline(event.target.value)}
        aria-invalid={!!errors.tagline} aria-describedby={errors.tagline ? 'sponsor-tagline-error' : undefined}/>{error('tagline')}</div>
    <div><label htmlFor="sponsor-link">Link</label>
      <input id="sponsor-link" name="link" type="url" required placeholder="https://" aria-invalid={!!errors.link}
        aria-describedby={errors.link ? 'sponsor-link-hint sponsor-link-error' : 'sponsor-link-hint'}/>
      <p className={styles.hint} id="sponsor-link-hint">Where a click goes. It must start with https://.</p>{error('link')}</div>
    <div><label htmlFor="sponsor-logo">Logo</label>
      <input id="sponsor-logo" name="logo" type="file" required accept=".png,.jpg,.jpeg,.webp,.svg"
        aria-invalid={!!errors.logo} aria-describedby={errors.logo ? 'sponsor-logo-hint sponsor-logo-error' : 'sponsor-logo-hint'}
        onChange={event => {
          const file = event.target.files?.[0];
          const valid = file && file.size > 0 && logoTypes.includes(file.type);
          setLogo(valid ? file : undefined);
          setErrors(previous => ({ ...previous, logo: file && !valid ? 'Choose a valid PNG, JPG, WebP or SVG image.' : undefined }));
        }}/>
      <p className={styles.hint} id="sponsor-logo-hint">A square works best: it’s shown 128×128 at most.</p>
      {preview && <img className={styles.preview} src={preview} width={48} height={48} alt="Logo preview"
        onError={() => { setLogo(undefined); setErrors(previous => ({ ...previous, logo: 'This logo could not be opened as an image.' })); }}/>}
      {error('logo')}</div>
    <div><label htmlFor="sponsor-email">Your email</label>
      <input id="sponsor-email" name="email" type="email" required autoComplete="email" aria-invalid={!!errors.email}
        aria-describedby={errors.email ? 'sponsor-email-hint sponsor-email-error' : 'sponsor-email-hint'}/>
      <p className={styles.hint} id="sponsor-email-hint">For the receipt, and to tell you when your frame is live.</p>{error('email')}</div>
    <div><label htmlFor="sponsor-notes">Anything else (optional)</label>
      <textarea id="sponsor-notes" name="notes" rows={3}/></div>
    <button className={styles.primary} type="submit">Continue to payment — $30 / month</button>
    <p className={styles.hint}>By submitting, you agree to the <Link href="/terms/">Terms</Link> and to the Not-allowed list above.</p>
    {mailto && <div className={styles.confirmation} role="status">
      <p>Thanks. Payment is not connected yet, and your frame hasn’t been reserved. Email your details and attach your logo so we can confirm availability and send a payment link.</p>
      <a href={mailto}>Email {contactEmail}</a>
    </div>}
  </form>;
}

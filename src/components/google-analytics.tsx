const measurementId = 'G-YSZZMM0451';

// Enhanced Measurement owns initial and History API page views. Do not also
// dispatch manual page_view events from route effects: that would double-count.
const initializeGoogleAnalytics = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}', {
  allow_google_signals: false,
  allow_ad_personalization_signals: false
});
`;

export function GoogleAnalytics() {
  return <>
    <script async src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}/>
    <script id="zipora-ga4-config" dangerouslySetInnerHTML={{ __html: initializeGoogleAnalytics }}/>
  </>;
}

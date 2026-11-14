(function () {
  const params = new URLSearchParams(window.location.search);
  const referralCode = params.get('ref');
  if (!referralCode) return;

  localStorage.setItem('ref_code', referralCode);
  let visitorId = localStorage.getItem('bp_affiliate_visitor_id');
  if (!visitorId) {
    visitorId = window.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
      const random = Math.random() * 16 | 0;
      return (character === 'x' ? random : (random & 3 | 8)).toString(16);
    });
    localStorage.setItem('bp_affiliate_visitor_id', visitorId);
  }

  fetch('/.netlify/functions/affiliate-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ referral_code: referralCode, visitor_id: visitorId })
  }).catch((error) => console.warn('Affiliate visit tracking failed:', error));
})();

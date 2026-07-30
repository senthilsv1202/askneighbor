export function maskPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    return `(***) ***-${digits.slice(-4)}`;
  }
  if (digits.length >= 4) {
    return `***-${digits.slice(-4)}`;
  }
  return '***';
}

export function maskEmail(email) {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 2)}***@${domain}`;
}

export function maskProviders(providers) {
  return providers.map(p => ({
    ...p,
    phone: maskPhone(p.phone),
    email: maskEmail(p.email),
  }));
}

// Community activity and AI summaries surface who recommended something.
// Only the first name is ever exposed — never the full name or email.
export function firstName(fullName) {
  if (!fullName) return 'A neighbor';
  return fullName.trim().split(/\s+/)[0];
}

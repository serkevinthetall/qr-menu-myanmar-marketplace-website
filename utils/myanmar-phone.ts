export function normalizeMyanmarPhone(number: string): string {
  if (!number) {
    return '';
  }

  let clean = '';
  const raw = String(number);

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if ((ch >= '0' && ch <= '9') || ch === '+') {
      clean += ch;
    }
  }

  if (clean.startsWith('+959')) {
    clean = `09${clean.substring(4)}`;
  } else if (clean.startsWith('959')) {
    clean = `09${clean.substring(3)}`;
  } else if (clean.startsWith('+950')) {
    clean = `0${clean.substring(4)}`;
  } else if (clean.startsWith('950')) {
    clean = `0${clean.substring(3)}`;
  } else if (clean.startsWith('+95')) {
    clean = `0${clean.substring(3)}`;
  } else if (/^9\d{7,}$/.test(clean)) {
    // Mobile without leading 0 → 09…
    clean = `0${clean}`;
  }

  return clean;
}

export function lastPhoneDigits(phone: string, count: number): string {
  const normalized = normalizeMyanmarPhone(phone);
  if (normalized.length <= count) {
    return normalized;
  }
  return normalized.substring(normalized.length - count);
}

export function validateMyanmarPhone(number: string, fieldName = 'ဖုန်းနံပါတ်'): string {
  if (!number) {
    throw new Error(`${fieldName} ဖြည့်ရန်လိုအပ်ပါသည်။`);
  }

  const phone = normalizeMyanmarPhone(number);

  if (phone.startsWith('+95')) {
    throw new Error(
      `${fieldName} ကို မြန်မာ local format ဖြင့်သာ ထည့်ပါ။ +95 မသုံးပါနှင့်။ 09 ဖြင့် စရပါမည်။`,
    );
  }

  if (!/^[0-9]+$/.test(phone)) {
    throw new Error(`${fieldName} တွင် ဂဏန်းများသာ ထည့်ရပါမည်။`);
  }

  if (!phone.startsWith('09')) {
    throw new Error(`${fieldName} သည် 09 ဖြင့် စရပါမည်။`);
  }

  if (phone.length < 8) {
    throw new Error(`${fieldName} သည် အနည်းဆုံး ဂဏန်း ၈ လုံး ရှိရပါမည်။`);
  }

  return phone;
}

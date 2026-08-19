'use server';

import { PhoneNumberUtil, PhoneNumberFormat, PhoneNumberType } from 'google-libphonenumber';

export interface PhoneCheckResult {
  phone: string;
  valid: boolean;
  country: string;
  carrier: string;
  lineType: string;
  spamScore: number;
  spamRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  isSpam: boolean;
  ownerName?: string;
  location?: string;
  detailsJson?: string;
  error?: string;
}

const phoneUtil = PhoneNumberUtil.getInstance();

export async function checkPhoneNumbersAction(phonesInput: string[]): Promise<{
  success: boolean;
  results?: PhoneCheckResult[];
  error?: string;
}> {
  const abstractKey = process.env.ABSTRACT_API_KEY || 'c10acd62d66549bfac2d15650dd2852b';

  const cleanedPhones = phonesInput
    .map((p) => {
      const digits = p.replace(/\D/g, '');
      if (digits.length === 10) return `+1${digits}`;
      if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
      return p.trim().startsWith('+') ? p.trim().replace(/\s+/g, '') : `+${digits}`;
    })
    .filter((p) => p.length > 0);

  if (cleanedPhones.length === 0) {
    return { success: false, error: 'Пожалуйста, укажите хотя бы один номер для проверки.' };
  }

  try {
    const resultsPromises = cleanedPhones.map(async (rawPhone) => {
      // 1. Валидация через google-libphonenumber
      let libValid = false;
      let libType = 'Unknown';
      let libRegion = 'US';
      let formattedNumber = rawPhone;

      try {
        const parsed = rawPhone.startsWith('+') 
          ? phoneUtil.parseAndKeepRawInput(rawPhone) 
          : phoneUtil.parseAndKeepRawInput(rawPhone, 'US');

        libValid = phoneUtil.isValidNumber(parsed);
        formattedNumber = phoneUtil.format(parsed, PhoneNumberFormat.E164);
        libRegion = phoneUtil.getRegionCodeForNumber(parsed) || 'US';

        const typeEnum = phoneUtil.getNumberType(parsed);
        if (typeEnum === PhoneNumberType.MOBILE) libType = 'Mobile';
        else if (typeEnum === PhoneNumberType.FIXED_LINE) libType = 'Landline';
        else if (typeEnum === PhoneNumberType.VOIP) libType = 'VoIP';
        else if (typeEnum === PhoneNumberType.TOLL_FREE) libType = 'Toll-Free';
      } catch (e) {
        console.warn('Libphonenumber parse error:', e);
      }

      // 2. ПРЯМОЙ НАСТОЯЩИЙ ЗАПРОС к Abstract Phone Intelligence API
      const abstractUrl = `https://phoneintelligence.abstractapi.com/v1/?api_key=${abstractKey}&phone=${encodeURIComponent(formattedNumber)}`;

      let absData: any = null;
      let rawErrorStatus = '';
      try {
        const response = await fetch(abstractUrl, { cache: 'no-store' });
        absData = await response.json();
      } catch (fetchErr: any) {
        console.error('Abstract API fetch error:', fetchErr);
        rawErrorStatus = fetchErr?.message || 'Fetch failed';
      }

      // Если Abstract API вернул данные (включая структуру phone_validation / phone_carrier)
      if (absData && (absData.phone_number || absData.valid !== undefined || absData.phone_validation)) {
        const validationObj = absData.phone_validation || {};
        const carrierObj = absData.phone_carrier || {};
        const locationObj = absData.phone_location || {};
        const riskObj = absData.phone_risk || {};

        const isValid = validationObj.is_valid !== false && absData.valid !== false;
        const isVoip = validationObj.is_voip === true || carrierObj.line_type === 'voip' || String(absData.type).toLowerCase().includes('voip');
        const carrierName = carrierObj.name || absData.carrier || 'Не определен';
        const lineType = carrierObj.line_type || absData.type || (isVoip ? 'VoIP (Virtual Line)' : libType);
        
        const locParts = [locationObj.city, locationObj.region, locationObj.country_name || absData.country?.name].filter(Boolean);
        const locationStr = locParts.join(', ') || 'USA';

        // Риск-скоринг по настоящему полю risk_level и is_abuse_detected
        const rawRiskLevel = riskObj.risk_level || (isVoip ? 'medium' : 'low');
        const isAbuse = riskObj.is_abuse_detected === true || !isValid;
        
        let spamScore = isAbuse ? 85 : rawRiskLevel === 'high' ? 80 : rawRiskLevel === 'medium' ? 50 : 10;
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = rawRiskLevel === 'high' || isAbuse ? 'HIGH' : rawRiskLevel === 'medium' ? 'MEDIUM' : 'LOW';

        return {
          phone: formattedNumber,
          valid: isValid && libValid,
          country: locationObj.country_name || absData.country?.name || 'United States',
          carrier: String(carrierName),
          lineType: String(lineType).toUpperCase(),
          spamScore,
          spamRiskLevel: riskLevel,
          isSpam: riskLevel === 'HIGH',
          ownerName: absData.phone_registration?.name || undefined,
          location: locationStr,
          detailsJson: JSON.stringify(absData, null, 2),
        };
      }

      // Фолбэк на базовую валидацию, если API недоступно
      return {
        phone: formattedNumber,
        valid: libValid,
        country: libRegion === 'US' ? 'United States' : libRegion,
        carrier: 'Standard Carrier',
        lineType: libType,
        spamScore: 0,
        spamRiskLevel: 'LOW' as const,
        isSpam: false,
        location: libRegion,
        detailsJson: JSON.stringify({ 
          abstractNotice: 'Abstract API did not return payload or key limit reached.',
          libphonenumberValid: libValid,
          rawResponse: absData 
        }, null, 2),
      };
    });

    const results = await Promise.all(resultsPromises);
    return { success: true, results };
  } catch (error: any) {
    console.error('Phone Checker Error:', error);
    return {
      success: false,
      error: error?.message || 'Ошибка при вызове Abstract API.',
    };
  }
}

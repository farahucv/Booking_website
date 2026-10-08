import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";

const dict = {
  ar: {
    brand: "جود الشاوي",
    tagline: "استوديو مكياج — القصيم، بريدة",
    intro: "استوديو متخصص في مكياج السهرة والملكة والعروس، بلمسة تُبرز جمالكِ الطبيعي.",
    bookCta: "اطلبي موعدكِ",
    portfolio: "نماذج الأعمال",
    portfolioEmpty: "ستُضاف صور الأعمال قريبًا.",
    services: "الخدمات والأسعار",
    contact: "تواصلي معنا",
    sar: "ريال",
    perPerson: "للشخص",
    forBride: "للعروس",
    lashesFree: "الرموش مجانية مع المكياج",
    svc_evening: "مكياج سهرة",
    svc_queen: "مكياج ملكة",
    svc_bride: "مكياج عروس",
    deposit: "العربون",
    total: "مجموع المكياج",
    remaining: "المتبقي",
    hairTitle: "تصفيف الشعر مع المصففة سارة",
    hairOpt: "أرغب بتصفيف الشعر مع المصففة سارة",
    hairNote: "200–350 ريال حسب الطول والكثافة، العروس 400 ريال. يحتاج تنسيقًا وتأكيدًا منفصلًا.",
    hairCount: "عدد الراغبات",
    hairBride: "تشمل العروس",
    hairLength: "طول الشعر",
    hairDensity: "كثافة الشعر",
    short: "قصير", medium: "متوسط", long: "طويل",
    light: "خفيف", thick: "كثيف",
    hairRange: "سعر الشعر التقديري",
    travelPending: "رسوم المشوار تُحدد عند مراجعة الطلب",
    travelFee: "رسوم المشوار",
    step_services: "الخدمات",
    step_location: "المكان",
    step_time: "الموعد",
    step_info: "بياناتكِ",
    step_review: "المراجعة",
    next: "التالي", back: "رجوع", submit: "إرسال طلب الحجز",
    loc_at_jood: "في الاستوديو — بريدة",
    loc_client_in_buraidah: "زيارة منزلية داخل بريدة",
    loc_client_outside: "زيارة منزلية خارج بريدة",
    locBlocked: "نرحّب بكِ في الاستوديو ببريدة 🤍 الزيارة المنزلية لمكياج سهرة لشخص واحد غير متاحة.",
    city: "المدينة / المحافظة", district: "الحي", locDesc: "وصف المكان", locUrl: "رابط الموقع (اختياري)",
    pickDate: "اختاري اليوم", pickTime: "اختاري الوقت", noSlots: "لا توجد أوقات متاحة في هذا اليوم.",
    name: "الاسم", phone: "رقم الجوال", notes: "ملاحظات",
    policyTitle: "سياسة الحجز",
    policyText: "إرسال الطلب لا يعني تأكيد الموعد. بعد الموافقة المبدئية من الاستوديو يُحوَّل العربون خلال 24 ساعة. في حال الإلغاء من طرف العميلة، العربون غير مسترد.",
    agree: "أوافق على سياسة الحجز",
    summary: "ملخص الحجز",
    showSummary: "عرض الملخص",
    submittedTitle: "تم استلام طلبكِ",
    submittedText: "سيتواصل معكِ فريق الاستوديو بعد مراجعته. إرسال الطلب لا يعني تأكيد الموعد.",
    orderNo: "رقم الطلب",
    trackLink: "رابط متابعة الطلب",
    copy: "نسخ",
    bookingClosed: "الحجز الإلكتروني غير متاح حاليًا. تواصلي معنا عبر واتساب.",
    whatsapp: "واتساب",
    whatsappDirect: "تفضّلين التنسيق المباشر؟",
    whatsappDirectText: "راسلينا على واتساب وسيتولى فريقنا ترتيب موعدكِ.",
    status: "الحالة",
    st_pending_review: "قيد المراجعة",
    st_pre_approved: "موافقة مبدئية — بانتظار العربون",
    st_receipt_pending: "إيصال العربون قيد التحقق",
    st_confirmed: "مؤكد نهائيًا",
    st_rejected: "مرفوض",
    st_expired: "انتهت مهلة العربون",
    st_cancelled: "ملغي",
    bankDetails: "بيانات التحويل",
    bankName: "البنك", beneficiary: "اسم المستفيد", iban: "الآيبان",
    timeLeft: "الوقت المتبقي",
    uploadReceipt: "رفع إيصال التحويل",
    receiptUploaded: "تم رفع الإيصال، وسيتحقق فريق الاستوديو من وصول المبلغ.",
    expiredNote: "انتهت المهلة. تواصلي معنا لإعادة التحقق من توفر الموعد.",
    address: "العنوان",
    date: "التاريخ",
    notFound: "الطلب غير موجود",
    admin: "لوحة الإدارة",
    login: "تسجيل الدخول", email: "البريد الإلكتروني", password: "كلمة المرور", logout: "خروج",
    signup: "إنشاء حساب",
    error: "حدث خطأ، حاولي مرة أخرى.",
    required: "يرجى تعبئة الحقول المطلوبة",
    hours: "ساعة", minutes: "دقيقة",
    duration: "المدة التقديرية",
  },
  en: {
    brand: "Jood Alshawi",
    tagline: "Makeup Studio — Qassim, Buraidah",
    intro: "A makeup studio specializing in evening, queen and bridal looks that bring out your natural beauty.",
    bookCta: "Book your appointment",
    portfolio: "Studio portfolio",
    portfolioEmpty: "Portfolio photos coming soon.",
    services: "Services & prices",
    contact: "Contact us",
    sar: "SAR",
    perPerson: "per person",
    forBride: "for the bride",
    lashesFree: "Lashes are free with makeup",
    svc_evening: "Evening makeup",
    svc_queen: "Queen makeup",
    svc_bride: "Bridal makeup",
    deposit: "Deposit",
    total: "Makeup total",
    remaining: "Remaining",
    hairTitle: "Hair styling with stylist Sarah",
    hairOpt: "I'd like hair styling with stylist Sarah",
    hairNote: "SAR 200–350 depending on length & density, bride SAR 400. Requires separate coordination and confirmation.",
    hairCount: "Number of people",
    hairBride: "Includes the bride",
    hairLength: "Hair length",
    hairDensity: "Hair density",
    short: "Short", medium: "Medium", long: "Long",
    light: "Light", thick: "Thick",
    hairRange: "Estimated hair price",
    travelPending: "Travel fee is set when the request is reviewed",
    travelFee: "Travel fee",
    step_services: "Services",
    step_location: "Location",
    step_time: "Time",
    step_info: "Your details",
    step_review: "Review",
    next: "Next", back: "Back", submit: "Send booking request",
    loc_at_jood: "At our studio in Buraidah",
    loc_client_in_buraidah: "Home visit in Buraidah",
    loc_client_outside: "Home visit outside Buraidah",
    locBlocked: "We'd love to welcome you at our Buraidah studio 🤍 Home visits for evening makeup require more than one person.",
    city: "City / Governorate", district: "District", locDesc: "Place description", locUrl: "Location link (optional)",
    pickDate: "Choose a day", pickTime: "Choose a time", noSlots: "No available times on this day.",
    name: "Name", phone: "Mobile number", notes: "Notes",
    policyTitle: "Booking policy",
    policyText: "A request does not confirm the appointment. After the studio's initial approval, the deposit must be transferred within 24 hours. If the client cancels, the deposit is non-refundable.",
    agree: "I agree to the booking policy",
    summary: "Booking summary",
    showSummary: "Show summary",
    submittedTitle: "Your request has been received",
    submittedText: "Our team will contact you after review. Sending a request does not confirm the appointment.",
    orderNo: "Request number",
    trackLink: "Tracking link",
    copy: "Copy",
    bookingClosed: "Online booking is currently unavailable. Please contact us on WhatsApp.",
    whatsapp: "WhatsApp",
    whatsappDirect: "Prefer to chat directly?",
    whatsappDirectText: "Message us on WhatsApp and our team will arrange your appointment.",
    status: "Status",
    st_pending_review: "Under review",
    st_pre_approved: "Initially approved — awaiting deposit",
    st_receipt_pending: "Deposit receipt being verified",
    st_confirmed: "Confirmed",
    st_rejected: "Declined",
    st_expired: "Deposit deadline expired",
    st_cancelled: "Cancelled",
    bankDetails: "Transfer details",
    bankName: "Bank", beneficiary: "Beneficiary", iban: "IBAN",
    timeLeft: "Time left",
    uploadReceipt: "Upload transfer receipt",
    receiptUploaded: "Receipt uploaded. Our team will verify the transfer.",
    expiredNote: "The deadline passed. Contact us to re-check availability.",
    address: "Address",
    date: "Date",
    notFound: "Request not found",
    admin: "Admin",
    login: "Sign in", email: "Email", password: "Password", logout: "Sign out",
    signup: "Create account",
    error: "Something went wrong, please try again.",
    required: "Please fill in the required fields",
    hours: "h", minutes: "min",
    duration: "Estimated duration",
  },
} as const;

export type TKey = keyof typeof dict.ar;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string; tr: (ar: string, en: string) => string; dir: "rtl" | "ltr" };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved === "en" || saved === "ar") setLangState(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  const setLang = (l: Lang) => {
    localStorage.setItem("lang", l);
    setLangState(l);
  };
  const t = (k: TKey) => dict[lang][k];
  return (
    <I18nContext.Provider value={{ lang, setLang, t, tr: (a: string, e: string) => (lang === "ar" ? a : e), dir: lang === "ar" ? "rtl" : "ltr" }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const c = useContext(I18nContext);
  if (!c) throw new Error("useI18n outside provider");
  return c;
}

// Numbers always render in Western (English) digits, even in Arabic mode.
const numLocale = (lang: Lang) => (lang === "ar" ? "ar-SA-u-nu-latn" : "en-GB");

export function fmtMoney(n: number, lang: Lang) {
  return `${n.toLocaleString(numLocale(lang))} ${dict[lang].sar}`;
}

export function fmtDateTime(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", {
    timeZone: "Asia/Riyadh",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function fmtTime(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(numLocale(lang), {
    timeZone: "Asia/Riyadh",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

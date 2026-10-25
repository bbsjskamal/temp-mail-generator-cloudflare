export type LegalSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalTranslation = {
  privacyTitle: string;
  termsTitle: string;
  cookiesTitle: string;
  close: string;
  lastUpdated: string;
  privacy: LegalSection[];
  terms: LegalSection[];
  cookies: LegalSection[];
};

const updated = "17 September 2026";

export const LEGAL_TRANSLATIONS: Record<"en" | "es" | "zh" | "hi" | "fr", LegalTranslation> = {
  en: {
    privacyTitle: "Privacy & Identity Policy", termsTitle: "Terms of Service Agreement", cookiesTitle: "Cookie Policy", close: "Close Window", lastUpdated: `Last updated: ${updated}`,
    privacy: [
      { heading: "1. Consent", paragraphs: ["By using TempMail, you consent to this Privacy Policy. If you do not agree, please stop using the service."] },
      { heading: "2. Information we collect", paragraphs: ["TempMail does not require registration and does not ask for your name, address, personal email, phone number, or payment details. To provide support, we may receive the name, email address, and message that you voluntarily submit through the contact form."] },
      { heading: "3. Mailbox data and expiry", paragraphs: ["Incoming messages are processed to provide the temporary inbox. Mailbox credentials are held in a secure, HttpOnly session cookie and the mailbox is designed to expire after the displayed lifetime. Do not send sensitive, financial, medical, or confidential information to a disposable address."] },
      { heading: "4. Cookies, storage, and advertising", paragraphs: ["The site uses necessary browser storage for language, theme, saved messages, and consent preferences. The mailbox session uses a secure cookie. Advertising or analytics providers may use their own technologies under their published policies and applicable consent rules."] },
      { heading: "5. Your rights and children", paragraphs: ["You may request access, correction, or deletion of personal information that you voluntarily provided for support. TempMail does not knowingly collect personal information from children under 13. Contact us if you believe a child submitted information."] }
    ],
    terms: [
      { heading: "1. Service scope", paragraphs: ["TempMail provides inbound-only temporary email addresses for low-risk trials, forums, downloads, and verification messages. No registration is required, and outbound email is not supported."] },
      { heading: "2. Temporary storage", paragraphs: ["Messages, attachments, and sessions are available only for the displayed mailbox lifetime, normally 10 minutes. They may be removed when the mailbox expires or is deleted. Download anything you need before expiry."] },
      { heading: "3. Prohibited use", paragraphs: ["You must not use TempMail for fraud, impersonation, phishing, banking or financial-account abuse, evading identity or age checks, harassment, malware, spam, automated abuse, or any activity that violates law or another service's rules."], bullets: ["Do not deploy registration bots, scrapers, or abusive automation.", "Do not interfere with the service or attempt to access another visitor's mailbox.", "Do not use the service to harm a person, organization, or network."] },
      { heading: "4. Availability and warranties", paragraphs: ["The service is provided on an as-is basis. Mail delivery depends on the upstream provider, and we do not guarantee uninterrupted availability, delivery, or preservation of messages."] },
      { heading: "5. Liability and changes", paragraphs: ["To the extent allowed by law, TempMail is not liable for indirect loss, missed messages, or data removed after expiry. We may update these terms when necessary; continued use means you accept the current version."] }
    ],
    cookies: [
      { heading: "What we use", paragraphs: ["TempMail uses a small number of essential cookies and browser-storage items to keep the site functional. They do not read the contents of your inbox."] },
      { heading: "Essential storage", paragraphs: ["Local browser storage remembers your language, theme, saved messages, and cookie-consent choice. A secure HttpOnly cookie maintains the active mailbox session and expires with the mailbox."] },
      { heading: "Your choices", paragraphs: ["You can clear browser storage or block cookies in your browser settings. Blocking essential storage may prevent language preferences or the active mailbox session from being remembered. Advertising providers, if enabled, may set their own cookies under their policies."] }
    ]
  },
  es: {
    privacyTitle: "Política de Privacidad e Identidad", termsTitle: "Acuerdo de Términos del Servicio", cookiesTitle: "Política de Cookies", close: "Cerrar ventana", lastUpdated: `Última actualización: ${updated}`,
    privacy: [
      { heading: "1. Consentimiento", paragraphs: ["Al utilizar TempMail, acepta esta Política de Privacidad. Si no está de acuerdo, deje de utilizar el servicio."] },
      { heading: "2. Información que recopilamos", paragraphs: ["TempMail no requiere registro ni solicita su nombre, dirección, correo personal, teléfono o datos de pago. Para ofrecer soporte, podemos recibir el nombre, correo y mensaje que envíe voluntariamente mediante el formulario de contacto."] },
      { heading: "3. Datos del buzón y expiración", paragraphs: ["Los mensajes entrantes se procesan para ofrecer el buzón temporal. Las credenciales se mantienen en una cookie de sesión segura y HttpOnly, y el buzón está diseñado para expirar al terminar el tiempo mostrado. No envíe información sensible, financiera, médica o confidencial a una dirección desechable."] },
      { heading: "4. Cookies, almacenamiento y publicidad", paragraphs: ["El sitio usa almacenamiento necesario para el idioma, tema, mensajes guardados y preferencias de consentimiento. La sesión del buzón utiliza una cookie segura. Los proveedores de publicidad o analítica pueden usar sus propias tecnologías según sus políticas y las normas de consentimiento aplicables."] },
      { heading: "5. Sus derechos y los menores", paragraphs: ["Puede solicitar acceso, corrección o eliminación de la información que haya proporcionado voluntariamente para soporte. TempMail no recopila conscientemente información personal de menores de 13 años. Contáctenos si cree que un menor envió información."] }
    ],
    terms: [
      { heading: "1. Alcance del servicio", paragraphs: ["TempMail ofrece direcciones de correo temporales de entrada para pruebas de bajo riesgo, foros, descargas y mensajes de verificación. No se requiere registro y no se admite el envío de correos."] },
      { heading: "2. Almacenamiento temporal", paragraphs: ["Los mensajes, archivos adjuntos y sesiones solo están disponibles durante el tiempo mostrado, normalmente 10 minutos. Pueden eliminarse al expirar o borrar el buzón. Descargue lo que necesite antes de que expire."] },
      { heading: "3. Usos prohibidos", paragraphs: ["No debe utilizar TempMail para fraude, suplantación, phishing, abuso de cuentas bancarias o financieras, evasión de controles de identidad o edad, acoso, malware, spam, automatización abusiva ni actividades ilegales."], bullets: ["No use bots de registro, scrapers ni automatización abusiva.", "No interfiera con el servicio ni intente acceder al buzón de otro visitante.", "No utilice el servicio para perjudicar a personas, organizaciones o redes."] },
      { heading: "4. Disponibilidad y garantías", paragraphs: ["El servicio se ofrece tal cual. La entrega depende del proveedor externo y no garantizamos disponibilidad continua, entrega ni conservación de mensajes."] },
      { heading: "5. Responsabilidad y cambios", paragraphs: ["En la medida permitida por la ley, TempMail no responde por pérdidas indirectas, mensajes no recibidos ni datos eliminados al expirar. Podemos actualizar estos términos cuando sea necesario."] }
    ],
    cookies: [
      { heading: "Qué utilizamos", paragraphs: ["TempMail utiliza algunas cookies esenciales y elementos de almacenamiento del navegador para mantener el sitio funcional. No leen el contenido de su bandeja de entrada."] },
      { heading: "Almacenamiento esencial", paragraphs: ["El almacenamiento local recuerda su idioma, tema, mensajes guardados y elección de consentimiento. Una cookie segura y HttpOnly mantiene la sesión del buzón y expira con él."] },
      { heading: "Sus opciones", paragraphs: ["Puede borrar el almacenamiento o bloquear cookies desde la configuración del navegador. Al bloquearlas, es posible que no se recuerden sus preferencias o la sesión activa. Los proveedores publicitarios, si están habilitados, pueden usar sus propias cookies según sus políticas."] }
    ]
  },
  fr: {
    privacyTitle: "Politique de confidentialité et d'identité", termsTitle: "Accord sur les conditions d'utilisation", cookiesTitle: "Politique relative aux cookies", close: "Fermer la fenêtre", lastUpdated: `Dernière mise à jour : ${updated}`,
    privacy: [
      { heading: "1. Consentement", paragraphs: ["En utilisant TempMail, vous acceptez cette Politique de confidentialité. Si vous n'êtes pas d'accord, cessez d'utiliser le service."] },
      { heading: "2. Informations collectées", paragraphs: ["TempMail ne demande aucune inscription, aucun nom, adresse, e-mail personnel, téléphone ou donnée de paiement. Pour l'assistance, nous pouvons recevoir le nom, l'e-mail et le message que vous envoyez volontairement via le formulaire de contact."] },
      { heading: "3. Données de boîte et expiration", paragraphs: ["Les messages entrants sont traités pour fournir la boîte temporaire. Les identifiants sont conservés dans un cookie de session sécurisé HttpOnly et la boîte est conçue pour expirer à la fin de la durée affichée. N'envoyez pas d'informations sensibles, financières, médicales ou confidentielles à une adresse jetable."] },
      { heading: "4. Cookies, stockage et publicité", paragraphs: ["Le site utilise le stockage nécessaire pour la langue, le thème, les messages enregistrés et le consentement. La session de boîte utilise un cookie sécurisé. Les fournisseurs de publicité ou d'analyse peuvent utiliser leurs propres technologies selon leurs politiques et les règles de consentement applicables."] },
      { heading: "5. Vos droits et les enfants", paragraphs: ["Vous pouvez demander l'accès, la correction ou la suppression des informations volontairement fournies pour l'assistance. TempMail ne collecte pas sciemment d'informations personnelles auprès d'enfants de moins de 13 ans."] }
    ],
    terms: [
      { heading: "1. Portée du service", paragraphs: ["TempMail fournit des adresses e-mail temporaires entrantes pour les essais à faible risque, forums, téléchargements et messages de vérification. Aucune inscription n'est requise et l'envoi d'e-mails n'est pas disponible."] },
      { heading: "2. Stockage temporaire", paragraphs: ["Les messages, pièces jointes et sessions ne sont disponibles que pendant la durée affichée, généralement 10 minutes. Ils peuvent être supprimés à l'expiration ou à la suppression de la boîte. Téléchargez ce dont vous avez besoin avant l'expiration."] },
      { heading: "3. Utilisations interdites", paragraphs: ["Vous ne devez pas utiliser TempMail pour la fraude, l'usurpation, le phishing, l'abus de comptes bancaires ou financiers, le contournement des contrôles d'identité ou d'âge, le harcèlement, les logiciels malveillants, le spam, l'automatisation abusive ou toute activité illégale."], bullets: ["N'utilisez pas de bots d'inscription, de scrapers ou d'automatisation abusive.", "N'interférez pas avec le service et n'essayez pas d'accéder à la boîte d'un autre visiteur.", "N'utilisez pas le service pour nuire à une personne, une organisation ou un réseau."] },
      { heading: "4. Disponibilité et garanties", paragraphs: ["Le service est fourni en l'état. La livraison dépend du fournisseur en amont et nous ne garantissons ni disponibilité continue, ni livraison, ni conservation des messages."] },
      { heading: "5. Responsabilité et modifications", paragraphs: ["Dans la mesure permise par la loi, TempMail n'est pas responsable des pertes indirectes, messages manqués ou données supprimées à l'expiration. Ces conditions peuvent être mises à jour si nécessaire."] }
    ],
    cookies: [
      { heading: "Ce que nous utilisons", paragraphs: ["TempMail utilise quelques cookies essentiels et éléments de stockage du navigateur pour assurer le fonctionnement du site. Ils ne lisent pas le contenu de votre boîte de réception."] },
      { heading: "Stockage essentiel", paragraphs: ["Le stockage local mémorise votre langue, votre thème, vos messages enregistrés et votre choix de consentement. Un cookie sécurisé HttpOnly maintient la session active et expire avec la boîte."] },
      { heading: "Vos choix", paragraphs: ["Vous pouvez effacer le stockage ou bloquer les cookies dans votre navigateur. Le blocage peut empêcher la mémorisation des préférences ou de la session. Les fournisseurs publicitaires, s'ils sont activés, peuvent utiliser leurs propres cookies selon leurs politiques."] }
    ]
  },
  hi: {
    privacyTitle: "गोपनीयता और पहचान नीति", termsTitle: "सेवा की शर्तों का समझौता", cookiesTitle: "कुकी नीति", close: "विंडो बंद करें", lastUpdated: `अंतिम अपडेट: ${updated}`,
    privacy: [
      { heading: "1. सहमति", paragraphs: ["TempMail का उपयोग करके आप इस गोपनीयता नीति से सहमत होते हैं। यदि आप सहमत नहीं हैं, तो सेवा का उपयोग बंद कर दें।"] },
      { heading: "2. हम कौन-सी जानकारी लेते हैं", paragraphs: ["TempMail में पंजीकरण की आवश्यकता नहीं है और हम आपका नाम, पता, व्यक्तिगत ईमेल, फोन या भुगतान विवरण नहीं मांगते। सहायता के लिए आप संपर्क फॉर्म में स्वेच्छा से भेजा गया नाम, ईमेल और संदेश साझा कर सकते हैं।"] },
      { heading: "3. मेलबॉक्स डेटा और समाप्ति", paragraphs: ["आने वाले संदेश अस्थायी इनबॉक्स उपलब्ध कराने के लिए संसाधित होते हैं। क्रेडेंशियल सुरक्षित HttpOnly सत्र कुकी में रखे जाते हैं और मेलबॉक्स दिखाई गई अवधि के बाद समाप्त होने के लिए बनाया गया है। अस्थायी पते पर संवेदनशील, वित्तीय, चिकित्सीय या गोपनीय जानकारी न भेजें।"] },
      { heading: "4. कुकी, स्टोरेज और विज्ञापन", paragraphs: ["साइट भाषा, थीम, सहेजे गए संदेश और सहमति की पसंद के लिए आवश्यक ब्राउज़र स्टोरेज का उपयोग करती है। मेलबॉक्स सत्र सुरक्षित कुकी का उपयोग करता है। विज्ञापन या एनालिटिक्स प्रदाता अपनी नीतियों और लागू सहमति नियमों के अनुसार अपनी तकनीकें उपयोग कर सकते हैं।"] },
      { heading: "5. आपके अधिकार और बच्चे", paragraphs: ["आप सहायता के लिए स्वेच्छा से दी गई व्यक्तिगत जानकारी तक पहुंच, सुधार या हटाने का अनुरोध कर सकते हैं। TempMail 13 वर्ष से कम आयु के बच्चों की व्यक्तिगत जानकारी जानबूझकर एकत्र नहीं करता।"] }
    ],
    terms: [
      { heading: "1. सेवा का दायरा", paragraphs: ["TempMail कम जोखिम वाले परीक्षण, फोरम, डाउनलोड और सत्यापन संदेशों के लिए केवल आने वाले अस्थायी ईमेल पते देता है। पंजीकरण आवश्यक नहीं है और ईमेल भेजना उपलब्ध नहीं है।"] },
      { heading: "2. अस्थायी स्टोरेज", paragraphs: ["संदेश, अटैचमेंट और सत्र केवल दिखाई गई अवधि, सामान्यतः 10 मिनट, तक उपलब्ध रहते हैं। मेलबॉक्स समाप्त या हटने पर वे मिटाए जा सकते हैं। समाप्ति से पहले जरूरी सामग्री डाउनलोड करें।"] },
      { heading: "3. निषिद्ध उपयोग", paragraphs: ["TempMail का उपयोग धोखाधड़ी, प्रतिरूपण, फ़िशिंग, बैंकिंग या वित्तीय खाते के दुरुपयोग, पहचान या आयु जांच से बचने, उत्पीड़न, मैलवेयर, स्पैम, स्वचालित दुरुपयोग या किसी अवैध गतिविधि के लिए न करें।"], bullets: ["पंजीकरण बॉट, स्क्रेपर या दुरुपयोग करने वाला स्वचालन न चलाएं।", "सेवा में हस्तक्षेप न करें और किसी अन्य आगंतुक के मेलबॉक्स तक पहुंचने का प्रयास न करें।", "किसी व्यक्ति, संस्था या नेटवर्क को नुकसान पहुंचाने के लिए सेवा का उपयोग न करें।"] },
      { heading: "4. उपलब्धता और वारंटी", paragraphs: ["सेवा जैसी है उसी रूप में दी जाती है। मेल डिलीवरी बाहरी प्रदाता पर निर्भर है और हम लगातार उपलब्धता, डिलीवरी या संदेश सुरक्षित रहने की गारंटी नहीं देते।"] },
      { heading: "5. जिम्मेदारी और बदलाव", paragraphs: ["कानून की अनुमति की सीमा तक TempMail अप्रत्यक्ष नुकसान, छूटे संदेश या समाप्ति के बाद हटाए गए डेटा के लिए जिम्मेदार नहीं है। आवश्यकता होने पर हम इन शर्तों को अपडेट कर सकते हैं।"] }
    ],
    cookies: [
      { heading: "हम क्या उपयोग करते हैं", paragraphs: ["TempMail साइट को चलाने के लिए कुछ आवश्यक कुकी और ब्राउज़र स्टोरेज का उपयोग करता है। ये आपके इनबॉक्स की सामग्री नहीं पढ़ते।"] },
      { heading: "आवश्यक स्टोरेज", paragraphs: ["लोकल स्टोरेज आपकी भाषा, थीम, सहेजे गए संदेश और सहमति की पसंद याद रखता है। सुरक्षित HttpOnly कुकी सक्रिय मेलबॉक्स सत्र बनाए रखती है और मेलबॉक्स के साथ समाप्त होती है।"] },
      { heading: "आपके विकल्प", paragraphs: ["आप ब्राउज़र सेटिंग में स्टोरेज मिटा या कुकी ब्लॉक कर सकते हैं। ऐसा करने पर प्राथमिकताएं या सक्रिय सत्र याद नहीं रह सकता। विज्ञापन प्रदाता सक्षम होने पर अपनी नीतियों के अनुसार अपनी कुकी लगा सकते हैं।"] }
    ]
  },
  zh: {
    privacyTitle: "隐私与身份政策", termsTitle: "服务条款协议", cookiesTitle: "Cookie 政策", close: "关闭窗口", lastUpdated: `最后更新：${updated}`,
    privacy: [
      { heading: "1. 同意", paragraphs: ["使用 TempMail 即表示您同意本隐私政策。如果您不同意，请停止使用本服务。"] },
      { heading: "2. 我们收集的信息", paragraphs: ["TempMail 不要求注册，也不索取姓名、地址、个人邮箱、电话或付款信息。为了提供支持，我们可能收到您通过联系表单自愿提交的姓名、邮箱和留言。"] },
      { heading: "3. 邮箱数据与到期", paragraphs: ["我们处理收到的邮件以提供临时收件箱。邮箱凭据保存在安全的 HttpOnly 会话 Cookie 中，邮箱会在显示的期限结束后到期。请勿向临时地址发送敏感、财务、医疗或机密信息。"] },
      { heading: "4. Cookie、存储和广告", paragraphs: ["网站使用必要的浏览器存储来保存语言、主题、已保存邮件和同意偏好。邮箱会话使用安全 Cookie。广告或分析服务商可能依据其政策和适用的同意规则使用自己的技术。"] },
      { heading: "5. 您的权利与儿童", paragraphs: ["您可以请求访问、更正或删除您为获得支持而自愿提供的个人信息。TempMail 不会故意收集 13 岁以下儿童的个人信息。"] }
    ],
    terms: [
      { heading: "1. 服务范围", paragraphs: ["TempMail 为低风险试用、论坛、下载和验证邮件提供仅接收的临时邮箱。无需注册，也不支持发送邮件。"] },
      { heading: "2. 临时存储", paragraphs: ["邮件、附件和会话仅在显示的期限内可用，通常为 10 分钟。邮箱到期或被删除后，内容可能被清除。请在到期前下载需要保留的内容。"] },
      { heading: "3. 禁止使用", paragraphs: ["不得将 TempMail 用于欺诈、冒充、网络钓鱼、银行或金融账户滥用、规避身份或年龄验证、骚扰、恶意软件、垃圾邮件、自动化滥用或任何违法活动。"], bullets: ["不得部署注册机器人、爬虫或滥用自动化程序。", "不得干扰服务或尝试访问其他访客的邮箱。", "不得利用本服务伤害个人、组织或网络。"] },
      { heading: "4. 可用性与保证", paragraphs: ["本服务按现状提供。邮件投递取决于上游服务商，我们不保证持续可用、邮件送达或邮件长期保存。"] },
      { heading: "5. 责任与变更", paragraphs: ["在法律允许的范围内，TempMail 不对间接损失、未收到的邮件或到期后删除的数据负责。必要时我们可能更新这些条款。"] }
    ],
    cookies: [
      { heading: "我们使用的内容", paragraphs: ["TempMail 使用少量必要 Cookie 和浏览器存储来保持网站运行。这些技术不会读取您的收件箱内容。"] },
      { heading: "必要存储", paragraphs: ["本地存储会记住您的语言、主题、已保存邮件和 Cookie 同意选择。安全的 HttpOnly Cookie 用于保持活动邮箱会话，并随邮箱一起到期。"] },
      { heading: "您的选择", paragraphs: ["您可以清除浏览器存储或在浏览器设置中阻止 Cookie。阻止必要存储可能导致语言偏好或活动邮箱会话无法保留。广告服务商如被启用，可能依据其政策设置自己的 Cookie。"] }
    ]
  }
};

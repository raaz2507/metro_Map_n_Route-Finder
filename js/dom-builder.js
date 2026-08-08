/**
 * यूनिवर्सल फ़ंक्शन: कॉन्फ़िगरेशन ऑब्जेक्ट से DOM एलिमेंट्स बनाता है।
 * @param {Object} config - तत्वों का कॉन्फ़िगरेशन ऑब्जेक्ट
 * @param {HTMLElement} [rootContainer] - (Optional) रूट एलिमेंट्स को सीधे इस कंटेनर में जोड़ने के लिए
 * @returns {Object} सभी बनाए गए DOM Elements के References का ऑब्जेक्ट
 */
export function createDOMFromMap(config, rootContainer = null) {
    const refs = {};

    // Step 1: सबसे पहले सभी एलिमेंट्स को मेमोरी में क्रिएट करें
    Object.entries(config).forEach(([key, item]) => {
        const el = document.createElement(item.type);
        
        if (item.id) el.id = item.id;
        if (item.cls) el.className = item.cls;
        if (item.html_con !== undefined && item.html_con !== null) {
            el.innerHTML = item.html_con;
        }

        // अन्य एट्रीब्यूट्स सेट करें
        if (item.oth_att) {
            Object.entries(item.oth_att).forEach(([attrName, attrVal]) => {
                el.setAttribute(attrName, attrVal);
            });
        }

        // संदर्भ (Reference) स्टोर करें
        refs[key] = el;
    });

    // Step 2: पैरेंट-चाइल्ड रिलेशंस बनाएं और रूट एलिमेंट्स को डेस्टिनेशन में डालें
    Object.entries(config).forEach(([key, item]) => {
        const el = refs[key];

        if (item.parent && refs[item.parent]) {
            // अगर इसका कोई पैरेंट है जो इसी ऑब्जेक्ट में बना है, तो उसके अंदर डालो
            refs[item.parent].appendChild(el);
        } else if (rootContainer) {
            // यदि कोई पैरेंट नहीं है (Root Element है) और रूट कंटेनर दिया गया है
            rootContainer.appendChild(el);
        }
    });

    // सभी बनाए गए नोड्स के संदर्भ (References) वापस भेजें
    return refs;
}
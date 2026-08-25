# Metro Map & Route Finder - सिस्टम आर्किटेक्चर एवं डायग्राम्स (`doc2`)

इस फ़ोल्डर (`doc2`) में **Metro Map & Route Finder** प्रोजेक्ट के सभी 9 मुख्य सॉफ्टवेयर आर्किटेक्चर एवं सिस्टम डिज़ाइन डायग्राम्स विस्तृत हिन्दी (देवनागरी लिपि) व्याख्या तथा कोड सुधार नोट्स के साथ शामिल हैं। 

सभी डायग्राम्स **Mermaid.js** फॉर्मेट में लिखे गए हैं, जिन्हें किसी भी Markdown रेंडरर (GitHub, VS Code, Antigravity IDE) में सीधे विजुअल रूप में देखा जा सकता है।

---

## 📌 इंडेक्स और नेविगेशन (Index & Navigation)

| # | डायग्राम का नाम (Diagram Name) | फ़ाइल का नाम (File Link) | संक्षिप्त विवरण (Description) |
|---|---|---|---|
| 1 | **System Context Diagram** | [01_system_context.md](file:///d:/projects/metro_Map_n_Route%20Finder/doc2/01_system_context.md) | सिस्टम की बाहरी सीमा (Boundary), यूज़र और बाहरी Browser APIs का संपर्क। |
| 2 | **Feature Map** | [02_feature_map.md](file:///d:/projects/metro_Map_n_Route%20Finder/doc2/02_feature_map.md) | सिस्टम के सभी मुख्य फीचर्स (Routing, Map, Alarm, GPS, i18n, etc.) का माइंडमैप। |
| 3 | **Package Diagram** | [03_package_diagram.md](file:///d:/projects/metro_Map_n_Route%20Finder/doc2/03_package_diagram.md) | कोडबेस का लेयर्ड पैकेज स्ट्रक्चर (Pages, Components, Services, Core, Data)। |
| 4 | **UML Class Diagram** | [04_uml_class_diagram.md](file:///d:/projects/metro_Map_n_Route%20Finder/doc2/04_uml_class_diagram.md) | ES6 Classes (`RouteFinder`, `AlarmSystem`, `GpsTracker`, `MetroMap` आदि) का क्लास स्ट्रक्चर। |
| 5 | **ER Diagram** | [05_er_diagram.md](file:///d:/projects/metro_Map_n_Route%20Finder/doc2/05_er_diagram.md) | `data.json` और `stations_data.json` के एंटिटीज़ (Network, Line, Station, FarePolicy) का सम्बंध। |
| 6 | **Data Flow Diagram (DFD)** | [06_data_flow_diagram.md](file:///d:/projects/metro_Map_n_Route%20Finder/doc2/06_data_flow_diagram.md) | Level 0 और Level 1 Data Flow Diagram (इनपुट -> एल्गोरिदम -> DOM / हार्डवेयर आउटपुट)। |
| 7 | **Sequence Diagram** | [07_sequence_diagram.md](file:///d:/projects/metro_Map_n_Route%20Finder/doc2/07_sequence_diagram.md) | रूट खोजने और मैप पर हाइलाइट करने का Step-by-Step एग्जीक्यूशन सीक्वेंस। |
| 8 | **State Diagram (Alarm System)** | [08_state_diagram_alarm.md](file:///d:/projects/metro_Map_n_Route%20Finder/doc2/08_state_diagram_alarm.md) | Destination Alarm System की अवस्थाएँ (`INACTIVE`, `ARMED`, `RINGING`) और उनके ट्रांज़िशन। |
| 9 | **Deployment Diagram** | [09_deployment_diagram.md](file:///d:/projects/metro_Map_n_Route%20Finder/doc2/09_deployment_diagram.md) | क्लाइंट ब्राउज़र (DOM, Web Audio, Geolocation) और स्टैटिक वेब सर्वर का डिप्लॉयमेंट मॉडल। |

---

> **💡 Note (कोडबेस समीक्षा एवं मुख्य टिप्पणियाँ):**
> प्रत्येक `.md` फाइल में डायग्राम और व्याख्या के साथ निम्नलिखित महत्वपूर्ण पहलुओं को चिन्हित किया गया है:
> 1. **Private Encapsulation Violations**: `AlarmSystem`, `GpsTracker`, और `TrainSpeedometer` क्लासेज में पब्लिक स्टेट वेरिएबल्स और इंटरनल मेथड्स (जो `#private` होने चाहिए थे)।
> 2. **Clean Architecture Violations**: सर्विस लेयर में सीधे HTML DOM एलिमेंट का एक्सेस (`TrainSpeedometer.updateDisplay()`).
> 3. **Performance Optimizations**: String Allocation reduction in Dijkstra, PriorityQueue extraction, Circular Buffer for Moving Average Speed Filter, and Audio Context leaks.

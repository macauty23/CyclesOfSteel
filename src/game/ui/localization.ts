import Phaser from "phaser";
import { gameManager } from "../core/GameManager";

const THAI_FONT_FAMILY = "'Leelawadee UI', Tahoma, 'Noto Sans Thai', 'Trebuchet MS', sans-serif";

const EXACT_TRANSLATIONS: Record<string, string> = {
  "Cycles of Steel": "วัฏจักรแห่งเหล็กกล้า",
  "Combat Basics": "พื้นฐานการต่อสู้",
  "Move with WASD or the arrow keys.": "เคลื่อนที่ด้วย WASD หรือปุ่มลูกศร",
  "Dash with Shift or Space.": "พุ่งด้วย Shift หรือ Space",
  "Bind with Q to turn incoming strikes aside.": "ใช้ Q เพื่อปัดคมโจมตีที่เข้ามา",
  "Use J or left mouse for light attacks.": "ใช้ J หรือคลิกซ้ายเพื่อโจมตีเบา",
  "Use K or right mouse for heavy attacks.": "ใช้ K หรือคลิกขวาเพื่อโจมตีหนัก",
  "Aim with the mouse to keep attacks precise.": "เล็งด้วยเมาส์เพื่อให้การโจมตีแม่นยำ",
  "Watch the spacing ring and stamina bar.": "คอยดูวงระยะและแถบพลังงาน",
  "Plan around sword path, enchantment, and part upgrades.": "วางแผนตามสายดาบ มนตร์ และการปรับแต่งชิ้นส่วน",
  "Start Run": "เริ่มการเดินทาง",
  "Begin with arming sword": "เริ่มด้วยดาบอาร์มมิง",
  "Skip guided tutorial": "ข้ามบทสอนแบบนำทาง",
  "Tutorial": "บทสอน",
  "Live guided run": "บทสอนแบบเล่นจริง",
  "Test Mode": "โหมดทดสอบ",
  "Test mode disabled.": "ปิดโหมดทดสอบแล้ว",
  "Enter the Test Mode password.": "กรอกรหัสผ่านโหมดทดสอบ",
  "Test mode enabled.": "เปิดโหมดทดสอบแล้ว",
  "Test mode enabled. The password can still be earned later by beating the first elite.":
    "เปิดโหมดทดสอบแล้ว คุณยังปลดรับรหัสนี้ภายหลังได้เมื่อชนะอีลิตตัวแรก",
  "Wrong password.": "รหัสผ่านไม่ถูกต้อง",
  "Wrong password. You can still be given the password after beating the first elite.":
    "รหัสผ่านไม่ถูกต้อง คุณยังจะได้รับรหัสนี้หลังชนะอีลิตตัวแรก",
  "Try or earn it later": "ลองใส่รหัสหรือปลดรับภายหลัง",
  "Password awarded": "ได้รับรหัสแล้ว",
  "On: free upgrades": "เปิด: อัปเกรดฟรี",
  "Thai Mode": "โหมดภาษาไทย",
  Settings: "\u0e01\u0e32\u0e23\u0e15\u0e31\u0e49\u0e07\u0e04\u0e48\u0e32",
  "Game options": "\u0e15\u0e31\u0e27\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e40\u0e01\u0e21",
  Language: "\u0e20\u0e32\u0e29\u0e32",
  "Translate menu text": "แปลข้อความทั้งหมดเป็นภาษาไทย",
  "Menu text in Thai": "แสดงข้อความเป็นภาษาไทย",
  "Open Tutorial": "เปิดบทสอน",
  "Skip The Tutorial?": "ข้ามบทสอนหรือไม่?",
  "Are you sure you want to skip the tutorial? It takes about five minutes and explains the main controls, combat flow, and progression systems.":
    "แน่ใจหรือไม่ว่าจะข้ามบทสอน? ใช้เวลาประมาณห้านาทีและอธิบายการควบคุมหลัก จังหวะการต่อสู้ และระบบความก้าวหน้า",
  "Skip Anyway": "ข้ามต่อไป",
  "Start without the tutorial": "เริ่มโดยไม่เล่นบทสอน",
  Back: "ย้อนกลับ",
  "Previous page": "หน้าก่อน",
  Continue: "ดำเนินต่อ",
  Begin: "เริ่ม",
  "Next page": "หน้าถัดไป",
  "Leave Run": "ออกจากการเดินทาง",
  "Open run menu": "เปิดเมนูการเดินทาง",
  "Choose whether to step back to the forge, leave for the main menu, or keep the expedition going.":
    "เลือกว่าจะกลับไปโรงตีเหล็ก กลับสู่เมนูหลัก หรือเดินทางต่อ",
  "Return to Forge": "กลับไปโรงตีเหล็ก",
  "Back to upgrades": "กลับไปอัปเกรด",
  "Return to Main Menu": "กลับสู่เมนูหลัก",
  "End this run": "จบการเดินทางนี้",
  "Keep exploring": "สำรวจต่อ",
  Close: "ปิด",
  "Keep browsing": "ดูต่อ",
  "Main Menu": "เมนูหลัก",
  "Reset the run": "รีเซ็ตการเดินทาง",
  "World Map": "แผนที่โลก",
  "Chart a route through the current chapter, picking materials and trades that suit the weapon path you want next.":
    "วางเส้นทางผ่านบทปัจจุบัน เลือกวัสดุและการแลกเปลี่ยนให้เหมาะกับสายดาบที่อยากสร้างต่อ",
  "No Frontier": "ไม่มีเส้นทาง",
  "No node is currently selected.": "ยังไม่ได้เลือกจุดหมาย",
  Enter: "เข้า",
  "That route is not open yet.": "เส้นทางนี้ยังไม่เปิด",
  "Relic secured. Back to the forge.": "ได้รับวัตถุโบราณแล้ว กลับไปโรงตีเหล็ก",
  "Route resolved. Back to the forge.": "จัดการเส้นทางแล้ว กลับไปโรงตีเหล็ก",
  "That route could not be resolved.": "ไม่สามารถจัดการเส้นทางนี้ได้",
  "Trade expedition stock for the materials your current forge plan wants most.":
    "แลกเสบียงเดินทางเป็นวัสดุที่แผนตีดาบปัจจุบันต้องการมากที่สุด",
  "Trade made. Back to the forge.": "แลกเปลี่ยนสำเร็จ กลับไปโรงตีเหล็ก",
  "Not enough materials for that trade.": "วัสดุไม่พอสำหรับการแลกเปลี่ยนนี้",
  "Open The Route": "เปิดเส้นทาง",
  "Next Stage": "ด่านถัดไป",
  "Select an open route": "เลือกเส้นทางที่เปิดอยู่",
  "Enter combat": "เข้าสู่การต่อสู้",
  "Open trade": "เปิดการแลกเปลี่ยน",
  "Resolve route": "จัดการเส้นทาง",
  "Tutorial Route": "เส้นทางบทสอน",
  "This tutorial follows a fixed path: Plains, Savannah, Volcanic Lands, Lava Fields, and Volcano. The route does not branch, so you can focus on learning the systems step by step.":
    "บทสอนนี้ใช้เส้นทางตายตัว: ทุ่งราบ สะวันนา ดินแดนภูเขาไฟ ทุ่งลาวา และภูเขาไฟ เส้นทางไม่แตกแขนง เพื่อให้เรียนรู้ระบบต่าง ๆ ทีละขั้นอย่างชัดเจน",
  "How To Travel": "วิธีเดินทาง",
  "The highlighted node is always the next step. Select it with the mouse, then press the on-screen Next Stage button. Each area provides different materials for upgrades.":
    "จุดที่ถูกเน้นคือก้าวถัดไปเสมอ เลือกด้วยเมาส์ แล้วกดปุ่มด่านถัดไปบนหน้าจอ แต่ละพื้นที่ให้วัสดุสำหรับอัปเกรดต่างกัน",
  "Upgrade Screen": "หน้าจออัปเกรด",
  "After each fight, you return here. Offers are small permanent trinkets for the run. Training is also permanent for the run and changes how combat behaves, not just your raw numbers.":
    "หลังการต่อสู้แต่ละครั้ง คุณจะกลับมาที่นี่ ข้อเสนอคือเครื่องรางถาวรขนาดเล็กสำหรับรอบนี้ การฝึกก็เป็นผลถาวรของรอบและเปลี่ยนพฤติกรรมการต่อสู้ ไม่ใช่แค่ตัวเลขตรง ๆ",
  "Enchantments And Fittings": "มนตร์และชิ้นส่วน",
  "Enchantments cost 2 Essence and stay on the weapon when you upgrade into a new sword. Modification lets you rework the blade, guard, pommel, hilt, and tip.":
    "มนตร์ใช้ Essence 2 หน่วย และคงอยู่บนอาวุธเมื่ออัปเกรดเป็นดาบใหม่ การปรับแต่งช่วยให้เปลี่ยนใบดาบ การ์ด พอมเมล ด้าม และปลายดาบได้",
  "Next Step": "ขั้นต่อไป",
  "Open the full tech tree before continuing. This is where you choose a branch, spend materials, and change your weapon into a new upgrade.":
    "เปิดผังเทคโนโลยีเต็มก่อนดำเนินต่อ ที่นี่คือจุดที่คุณเลือกสาย ใช้วัสดุ และเปลี่ยนอาวุธให้เป็นขั้นอัปเกรดใหม่",
  "Weapon Branches": "สายอาวุธ",
  "You start with the Arming Sword. Unlocking a node changes your current weapon into that upgrade, so each choice affects the way your weapon behaves.":
    "คุณเริ่มด้วยดาบอาร์มมิง เมื่อปลดล็อกโหนด อาวุธปัจจุบันจะเปลี่ยนเป็นขั้นอัปเกรดนั้น ดังนั้นทุกตัวเลือกจึงเปลี่ยนรูปแบบการใช้งานของอาวุธ",
  "Branch Locks": "การล็อกสาย",
  "Once you choose one child on a branch, the sibling options on that split are locked. Look around first, then click when you are sure.":
    "เมื่อเลือกทางลูกหนึ่งในสายนั้น ตัวเลือกพี่น้องในจุดแยกเดียวกันจะถูกล็อก ดูให้รอบก่อน แล้วค่อยคลิกเมื่อแน่ใจ",
  "Costs And Materials": "ค่าใช้จ่ายและวัสดุ",
  "Early upgrades mostly use steel and wood. Later upgrades also require rarer materials. When you can afford a node, click it to unlock that upgrade.":
    "อัปเกรดช่วงต้นจะใช้เหล็กและไม้เป็นหลัก ส่วนช่วงหลังจะต้องใช้วัสดุหายากมากขึ้น เมื่อคุณจ่ายไหว ให้คลิกโหนดนั้นเพื่อปลดล็อก",
  "Click To Choose": "คลิกเพื่อเลือก",
  "Selections are click-based. Hovering only highlights what you are looking at, while clicking commits the node or fitting you want.":
    "การเลือกทั้งหมดใช้การคลิก การเอาเมาส์ชี้เพียงแค่ไฮไลต์สิ่งที่มองอยู่ แต่การคลิกจะยืนยันโหนดหรือชิ้นส่วนที่ต้องการ",
  "Tutorial Complete": "จบบทสอน",
  "You have completed the tutorial path and seen the main combat and progression systems. You can now return to the main menu and start a normal run.":
    "คุณผ่านเส้นทางบทสอนและได้เห็นระบบการต่อสู้กับความก้าวหน้าหลักแล้ว ตอนนี้กลับไปเมนูหลักและเริ่มรอบปกติได้",
  "Movement And Guard": "การเคลื่อนที่และการ์ด",
  "Move with WASD or the arrow keys. Dash with Shift or Space. Stay at a controlled distance and avoid rushing straight forward without a reason.":
    "เคลื่อนที่ด้วย WASD หรือปุ่มลูกศร พุ่งด้วย Shift หรือ Space รักษาระยะอย่างมีวินัยและอย่าพุ่งตรงเข้าไปโดยไม่มีเหตุผล",
  "Attacks And Measure": "การโจมตีและระยะวัด",
  "J or left mouse is the quicker attack. K or right mouse is the more committed attack. Use the spacing cue to attack from an effective distance.":
    "J หรือคลิกซ้ายคือการโจมตีที่เร็วกว่า K หรือคลิกขวาคือการโจมตีที่เสี่ยงและทุ่มมากกว่า ใช้ตัวบอกระยะเพื่อโจมตีจากระยะที่มีประสิทธิภาพ",
  "Stamina And Tempo": "พลังงานและจังหวะ",
  "Every dash and attack costs stamina. If you empty the bar, you become easy to punish. Let it recover between exchanges and think in tempos, not button spam.":
    "ทุกการพุ่งและการโจมตีใช้พลังงาน หากหลอดหมด คุณจะโดนลงโทษได้ง่าย ปล่อยให้มันฟื้นระหว่างการแลกจังหวะ และคิดเป็นจังหวะแทนการกดรัว",
  "Dash And Bind": "พุ่งและปัดคม",
  "Press Q during incoming impact to bind. A successful bind avoids the damage, reflects part of it, and briefly stuns the attacker. Ranged attacks are easier to bind.":
    "กด Q ตอนคมโจมตีกำลังจะกระทบเพื่อปัดคม หากสำเร็จจะไม่รับความเสียหาย สะท้อนบางส่วนกลับ และทำให้ผู้โจมตีมึนสั้น ๆ การโจมตีระยะไกลปัดคมได้ง่ายกว่า",
  "Positional Risk": "ความเสี่ยงด้านตำแหน่ง",
  "Dashes are strong, but they also change your position. Use them to create space, close distance, or escape recovery instead of using them constantly.":
    "การพุ่งมีพลัง แต่ก็เปลี่ยนตำแหน่งของคุณด้วย ใช้มันเพื่อเปิดระยะ เข้าประชิด หรือหนีช่วงฟื้นตัว แทนการกดใช้ตลอดเวลา",
  "Commit Weight": "น้ำหนักการทุ่ม",
  "Larger attacks carry more commitment. They move farther and recover more slowly, so use them when you have space and timing on your side.":
    "การโจมตีที่ใหญ่กว่าจะมีความทุ่มมากกว่า มันพุ่งไกลและฟื้นตัวช้ากว่า ดังนั้นใช้เมื่อคุณได้เปรียบทั้งพื้นที่และจังหวะ",
  "Combo Rules": "กฎคอมโบ",
  "The combo system changes combat behavior instead of only increasing damage. Flow, Press, and Dominion affect spacing and control, so timing matters more than repeated input.":
    "ระบบคอมโบเปลี่ยนพฤติกรรมการต่อสู้ ไม่ได้เพิ่มแค่ดาเมจ Flow, Press และ Dominion ส่งผลต่อระยะและการควบคุม ดังนั้นจังหวะสำคัญกว่าการกดซ้ำ",
  "Attack Classes": "ประเภทการโจมตี",
  "Some attacks work like lunges and control a straight line. Others work like cleaves and cover a wider arc. Use the attack class that fits the situation.":
    "การโจมตีบางแบบทำงานเหมือนการแทงพุ่ง คุมแนวตรงได้ดี ส่วนบางแบบเป็นการฟันกวาดที่ครอบคลุมมุมกว้าง เลือกใช้ประเภทให้เหมาะกับสถานการณ์",
  "Armor And Knockback": "เกราะและแรงผลัก",
  "Armor affects which attacks are effective. Thrusting is safer against protected targets, and knockback can move a target, interrupt actions, or reduce control.":
    "เกราะมีผลต่อการโจมตีที่ได้ผล การแทงปลอดภัยกว่ากับเป้าหมายที่ป้องกันดี และแรงผลักสามารถขยับเป้าหมาย ขัดจังหวะ หรือทำให้ควบคุมยากขึ้น",
  "Final Tutorial Fight": "การต่อสู้สุดท้ายของบทสอน",
  "This final fight expects better spacing, stamina management, and bind timing. Watch the windup, attack at the correct distance, and do not overcommit after a miss.":
    "การต่อสู้สุดท้ายนี้ต้องใช้การคุมระยะ การจัดการพลังงาน และจังหวะปัดคมที่ดีกว่าเดิม ดูช่วงง้าง โจมตีจากระยะที่ถูกต้อง และอย่าทุ่มเกินไปหลังพลาด",
  "Complete The Tutorial": "ผ่านบทสอนให้สำเร็จ",
  "Defeat this enemy and collect the materials to complete the tutorial. After that, you can start a normal run without the tutorial prompt in this session.":
    "เอาชนะศัตรูตัวนี้และเก็บวัสดุเพื่อจบบทสอน หลังจากนั้นคุณจะเริ่มรอบปกติได้โดยไม่ถูกถามบทสอนอีกในเซสชันนี้",
  "This tutorial explains movement, binds, stamina, upgrades, the tech tree, and a final fight in a fixed step-by-step sequence.":
    "บทสอนนี้อธิบายการเคลื่อนที่ การปัดคม พลังงาน การอัปเกรด ผังเทคโนโลยี และการต่อสู้สุดท้ายแบบเป็นขั้นตอนตายตัว",
  Route: "เส้นทาง",
  "You Will Learn": "สิ่งที่จะได้เรียนรู้",
  "Movement, spacing, and stamina.": "การเคลื่อนที่ ระยะ และพลังงาน",
  "Light and heavy commitment.": "ความทุ่มของการโจมตีเบาและหนัก",
  "Dash timing and binds on Q.": "จังหวะพุ่งและการปัดคมด้วย Q",
  "Why biomes feed different materials.": "เหตุใดไบโอมจึงให้วัสดุต่างกัน",
  "How the forge and tech tree shape your run.": "โรงตีเหล็กและผังเทคโนโลยีเปลี่ยนรอบของคุณอย่างไร",
  "How to handle an elite without panic.": "วิธีรับมืออีลิตโดยไม่เสียทรง",
  "Mini World Map": "แผนที่โลกย่อ",
  "The tutorial follows a fixed path so each stop can focus on one group of mechanics before the final fight.":
    "บทสอนใช้เส้นทางตายตัว เพื่อให้แต่ละจุดเน้นกลไกหลักทีละชุดก่อนถึงศึกสุดท้าย",
  Return: "กลับ",
  "Begin Tutorial": "เริ่มบทสอน",
  "Start the guided tutorial": "เริ่มบทสอนแบบนำทาง",
  "The Forge": "โรงตีเหล็ก",
  "Run Summary": "สรุปรอบ",
  "Full Tech Tree": "ผังเทคโนโลยีเต็ม",
  "Drag to pan": "ลากเพื่อแพน",
  "Continue Expedition": "เดินทางต่อ",
  "Return to the world map": "กลับสู่แผนที่โลก",
  Offers: "ข้อเสนอ",
  "Choose 1 of 3": "เลือก 1 จาก 3",
  Training: "การฝึก",
  "Permanent lesson": "บทเรียนถาวร",
  Enchant: "มนตร์",
  "Random bless": "สุ่มมนตร์",
  Trinkets: "เครื่องราง",
  "Owned bonuses": "โบนัสที่ครอบครอง",
  Modify: "ปรับแต่ง",
  "Blade parts": "ชิ้นส่วนดาบ",
  "Active Trinkets": "เครื่องรางที่ใช้งานอยู่",
  "Owned Training": "การฝึกที่ครอบครอง",
  Collection: "คอลเลกชัน",
  "Current Enchantment": "มนตร์ปัจจุบัน",
  "Visit the tech tree first": "ไปดูผังเทคโนโลยีก่อน",
  "Choose Trinket": "เลือกเครื่องราง",
  "Test mode: take as many trinkets as you want.": "โหมดทดสอบ: รับเครื่องรางได้ไม่จำกัด",
  "Trinket taken this forge visit.": "รับเครื่องรางแล้วในการเข้ามาโรงตีเหล็กครั้งนี้",
  "Choose one trinket.": "เลือกเครื่องรางหนึ่งชิ้น",
  "Test mode: take as many Training picks as you want.": "โหมดทดสอบ: เลือกการฝึกได้ไม่จำกัด",
  "Training taken this forge visit.": "รับการฝึกแล้วในการเข้ามาโรงตีเหล็กครั้งนี้",
  "Choose one permanent Training.": "เลือกการฝึกถาวรหนึ่งแบบ",
  Enchantments: "มนตร์",
  Roll: "สุ่ม",
  "Cost 2 Essence": "ใช้ Essence 2",
  "Catalyst Sacrifice": "สละตัวเร่ง",
  "Collected Bonuses": "โบนัสที่เก็บได้",
  Relics: "วัตถุโบราณ",
  Enchantment: "มนตร์",
  "No enchantment is active.": "ยังไม่มีมนตร์ที่ใช้งานอยู่",
  "No trinkets claimed.": "ยังไม่ได้รับเครื่องราง",
  "No Training claimed.": "ยังไม่ได้รับการฝึก",
  "Trinket claimed.": "รับเครื่องรางแล้ว",
  "No trinket choices left this visit.": "ไม่มีตัวเลือกเครื่องรางเหลือแล้วในการเข้ามาครั้งนี้",
  "Training added.": "เพิ่มการฝึกแล้ว",
  "That Training pick is unavailable right now.": "การฝึกนี้ยังไม่พร้อมให้เลือกตอนนี้",
  "Need 2 Essence to buy an enchantment.": "ต้องใช้ Essence 2 หน่วยเพื่อซื้อมนตร์",
  "No enchantment bound to this blade.": "ยังไม่มีมนตร์ผูกกับดาบนี้",
  "No enchantment bound. Buy one random enchantment for 2 Essence.": "ยังไม่มีมนตร์ผูกอยู่ ซื้อมนตร์สุ่มหนึ่งแบบด้วย Essence 2 หน่วย",
  "The bound enchant stays on your weapon when you upgrade into a new sword.":
    "มนตร์ที่ผูกอยู่จะติดอาวุธไปเมื่อคุณอัปเกรดเป็นดาบใหม่",
  "Rolling binds one random enchantment immediately.": "การสุ่มจะผูกมนตร์แบบสุ่มหนึ่งชนิดทันที",
  "Open Tech Tree": "เปิดผังเทคโนโลยี",
  "Tech Tree": "ผังเทคโนโลยี",
  "Drag outside a node to pan the tech tree.": "ลากนอกโหนดเพื่อแพนผังเทคโนโลยี",
  "Back to Forge": "กลับไปโรงตีเหล็ก",
  "Return to the forge": "กลับไปโรงตีเหล็ก",
  "Pan the tree, inspect a node, then return to the forge when you are ready.":
    "แพนผัง ตรวจดูโหนด แล้วกลับไปโรงตีเหล็กเมื่อพร้อม",
  "Inspect The Tree": "ตรวจดูผัง",
  Forged: "หลอมสำเร็จ",
  Sealed: "ผนึก",
  Locked: "ล็อก",
  "Sword Modification": "ปรับแต่งดาบ",
  "Current Weapon": "อาวุธปัจจุบัน",
  "Back to the forge tabs": "กลับไปแท็บโรงตีเหล็ก",
  Equipped: "สวมอยู่",
  "Equip Option": "สวมชิ้นส่วน",
  "Forge Option": "ตีชิ้นส่วน",
  "Spend materials": "ใช้วัสดุ",
  "Already active": "ใช้งานอยู่แล้ว",
  "Swap active fitting": "สลับชิ้นส่วนที่ใช้งาน",
  "That fitting could not be found.": "ไม่พบชิ้นส่วนนี้",
  "That fitting could not be equipped.": "ไม่สามารถสวมชิ้นส่วนนี้ได้",
  Default: "ค่าเริ่มต้น",
  Available: "พร้อมใช้",
  "Keeps the stock handling.": "คงลักษณะการใช้งานเดิมของอาวุธ",
  "Stronger binds and safer defensive structure": "การปัดคมแข็งแรงขึ้นและโครงป้องกันปลอดภัยขึ้น",
  "Better point control and cleaner line entries": "คุมปลายดาบดีขึ้นและเข้าระยะได้คมขึ้น",
  "Broader cutting coverage through the arc": "มุมฟันกว้างขึ้นและครอบคลุมมากขึ้น",
  "Quicker resets and livelier footwork": "รีเซ็ตไวขึ้นและเท้าทำงานคล่องขึ้น",
  "Heavier contact that wins space on impact": "แรงปะทะหนักขึ้นและแย่งพื้นที่ได้ดีขึ้น",
  "Improved endurance in longer exchanges": "อึดขึ้นในการแลกจังหวะยาว",
  "A refinement that preserves the weapon's stock identity.": "เป็นการปรับละเอียดที่ยังคงเอกลักษณ์เดิมของอาวุธ",
  "Choose Your Blade": "เลือกดาบของคุณ",
  "Each weapon starts with its own stance, speed, and attack identity. Your choice stays locked for the full run, then grows through the forge tech tree.":
    "อาวุธแต่ละชนิดเริ่มด้วยท่ายืน ความเร็ว และเอกลักษณ์การโจมตีของตัวเอง ทางเลือกนี้จะถูกล็อกตลอดทั้งรอบ แล้วค่อยเติบโตผ่านผังเทคโนโลยีของโรงตีเหล็ก",
  "Enter Arena": "เข้าสู่สนาม",
  "Begin level 1": "เริ่มด่าน 1",
  "Return to menu": "กลับสู่เมนู",
  "Run Broken": "การเดินทางล้มเหลว",
  "Restart Run": "เริ่มรอบใหม่",
  "Begin again": "เริ่มใหม่อีกครั้ง",
  "Leave the arena": "ออกจากสนาม",
  "Not enough stamina": "พลังงานไม่พอ",
  "Spacing matters: green ring means your next strike is in measure.":
    "ระยะสำคัญ วงสีเขียวแปลว่าการโจมตีครั้งต่อไปอยู่ในระยะเหมาะสม",
  "Target broken. Collect ": "เป้าหมายพังแล้ว เก็บ ",
  " to leave the arena.": " เพื่อออกจากสนาม",
  "Final fight complete. Opening the tutorial summary.": "จบการต่อสู้สุดท้ายแล้ว กำลังเปิดสรุปบทสอน",
  "Materials collected. Returning to the upgrade screen.": "เก็บวัสดุครบแล้ว กำลังกลับสู่หน้าจออัปเกรด",
  "Enemy broken\nCollect the spoils": "ศัตรูพังแล้ว\nเก็บของรางวัล",
  "Collect the spoils": "เก็บของรางวัล",
  "Hit out of line": "โดนเล่นงานนอกแนว",
  "Guard softened the blow": "การ์ดช่วยผ่อนแรงปะทะ",
  "Winded and punished": "หมดแรงและโดนลงโทษ",
  "Flow online": "เข้าสู่ Flow",
  "Press online": "เข้าสู่ Press",
  "Dominion online": "เข้าสู่ Dominion",
  "Move WASD/Arrows  Dash Shift/Space  Bind Q\nLight J/LMB  Heavy K/RMB":
    "เคลื่อนที่ WASD/ลูกศร  พุ่ง Shift/Space  ปัดคม Q\nโจมตีเบา J/คลิกซ้าย  โจมตีหนัก K/คลิกขวา",
  "No Training": "ไม่มีการฝึก",
  Calm: "สงบ",
  Flow: "ลื่นไหล",
  Press: "กดดัน",
  Dominion: "ครอบงำ",
  "Enemy roster": "รายชื่อศัตรู",
  "Primary materials": "วัสดุหลัก",
  Rewards: "รางวัล",
  Weapon: "อาวุธ",
  Branch: "สาย",
  Affinity: "สายถนัด",
  Path: "เส้นทาง",
  Site: "สถานที่",
  "Useful for": "เหมาะกับ",
  "a new enchantment": "มนตร์ใหม่",
  "That enchantment": "มนตร์นั้น",
  "No relics collected yet.": "ยังไม่มีวัตถุโบราณ",
  "No enchantment bound to this blade.\n\nNext roll favor: ": "ยังไม่มีมนตร์ผูกกับดาบนี้\n\nการสุ่มครั้งถัดไปจะเอนเอียงไปทาง ",
  "No enchantment bound. Next roll favors ": "ยังไม่มีมนตร์ผูกอยู่ การสุ่มครั้งถัดไปจะเอนเอียงไปทาง ",
  " is active.": " กำลังทำงานอยู่",
  " is active. Next roll favors ": " กำลังทำงานอยู่ การสุ่มครั้งถัดไปจะเอนเอียงไปทาง ",
  "The forge binds ": "โรงตีเหล็กผูก ",
  " is favored on your next roll.": " ในการสุ่มครั้งถัดไป",
  "Need ": "ต้องใช้ ",
  "No enchantment bound.": "ยังไม่มีมนตร์ผูกอยู่",
  "No node is currently selected": "ยังไม่ได้เลือกจุดหมาย",
  Unknown: "ไม่ทราบ",
  Free: "ฟรี",
  "No enchantment bound to this blade.\n\nNext roll favor": "ยังไม่มีมนตร์ผูกกับดาบนี้\n\nการสุ่มครั้งถัดไปเอนเอียงไปทาง",
  "No enchantment bound. Next roll favors": "ยังไม่มีมนตร์ผูกอยู่ การสุ่มครั้งถัดไปเอนเอียงไปทาง"
};

const PHRASE_TRANSLATIONS: Array<[string, string]> = [
  ["Target broken. Collect ", "เป้าหมายพังแล้ว เก็บ "],
  [" to leave the arena.", " เพื่อออกจากสนาม"],
  ["The forge binds ", "โรงตีเหล็กผูก "],
  [" is favored on your next roll.", " ในการสุ่มครั้งถัดไป"],
  ["Next roll favor: ", "การสุ่มครั้งถัดไปเอนเอียงไปทาง "],
  ["Next roll favors ", "การสุ่มครั้งถัดไปเอนเอียงไปทาง "],
  ["Need ", "ต้องใช้ "],
  ["Defeat the ", "เอาชนะ "],
  [" to earn ", " เพื่อรับ "],
  ["Enemy ", "ศัตรู "],
  [" overwhelmed you.", " เล่นงานคุณจนพ่าย"],
  ["Weapon: ", "อาวุธ: "],
  ["Branch: ", "สาย: "],
  ["Affinity: ", "สายถนัด: "],
  ["Training: ", "การฝึก: "],
  ["Rewards: ", "รางวัล: "],
  ["Primary materials: ", "วัสดุหลัก: "],
  ["Enemy roster: ", "รายชื่อศัตรู: "],
  ["Site: ", "สถานที่: "],
  ["Useful for: ", "เหมาะกับ: "],
  ["Path: ", "เส้นทาง: "],
  ["Relics: ", "วัตถุโบราณ: "],
  ["Trinkets: ", "เครื่องราง: "],
  ["Enchantments: ", "มนตร์: "],
  ["Lore: ", "เกร็ดเรื่อง: "],
  ["Role: ", "บทบาท: "],
  ["Adjustments: ", "การปรับค่า: "],
  ["Traits: ", "คุณลักษณะ: "],
  ["Status: ", "สถานะ: "],
  ["Lowland Two-Handed Claymore", "โลว์แลนด์เคลย์มอร์สองมือ"],
  ["Landsknecht Zweihander", "ซไวแฮนเดอร์ลันด์สคเนคท์"],
  ["Zweihander (Flamberge)", "ซไวแฮนเดอร์ (ฟลามแบร์จ)"],
  ["Renaissance Cavalry Sword", "ดาบทหารม้ายุคเรอเนสซองส์"],
  ["Oakeshott Type XVIIIc", "โอคช็อตต์แบบ XVIIIc"],
  ["Heavy Cavalry Sword", "ดาบทหารม้าหนัก"],
  ["Cavalry Arming Sword", "ดาบอาร์มมิงทหารม้า"],
  ["Master's Montante", "มอนตันเตของปรมาจารย์"],
  ["Two-Handed Montante", "มอนตันเตสองมือ"],
  ["Spanish Montante", "มอนตันเตสเปน"],
  ["Highland Claymore", "ไฮแลนด์เคลย์มอร์"],
  ["Claymore", "เคลย์มอร์"],
  ["Greatsword", "เกรตซอร์ด"],
  ["Longsword", "ลองซอร์ด"],
  ["War Arming Sword", "ดาบอาร์มมิงสงคราม"],
  ["Thrust Arming Sword", "ดาบอาร์มมิงสายแทง"],
  ["Border Duel Sword", "ดาบดวลชายแดน"],
  ["Court Rapier", "ราเปียร์ราชสำนัก"],
  ["Master's Rapier", "ราเปียร์ของปรมาจารย์"],
  ["Pappenheimer Rapier", "ราเปียร์ปัพเพนไฮเมอร์"],
  ["Needleblade", "เข็มคม"],
  ["Two-Handed Estoc", "เอสต็อกสองมือ"],
  ["Reinforced Estoc", "เอสต็อกเสริมแกน"],
  ["Broad Arming Sword", "ดาบอาร์มมิงสายกว้าง"],
  ["Heavy Falchion", "ฟัลชันหนัก"],
  ["Great Falchion", "เกรตฟัลชัน"],
  ["Naval Cutlass", "คัตลาสเรือรบ"],
  ["Hanger Sword", "ดาบแฮงเกอร์"],
  ["Two-Handed Messer", "เมสเซอร์สองมือ"],
  ["Grosses Messer", "โกรสเซสเมสเซอร์"],
  ["Langes Messer", "ลังเกสเมสเซอร์"],
  ["Kriegsmesser", "ครีกส์เมสเซอร์"],
  ["Arming Sword", "ดาบอาร์มมิง"],
  ["Rapier", "ราเปียร์"],
  ["Sidesword", "ไซด์ซอร์ด"],
  ["Estoc", "เอสต็อก"],
  ["Falchion", "ฟัลชัน"],
  ["Hauswehr", "เฮาส์แวร์"],
  ["Messer", "เมสเซอร์"],
  ["Montante", "มอนตันเต"],
  ["Zweihander", "ซไวแฮนเดอร์"],
  ["Panzerstecher", "พานเซอร์สเทเชอร์"],
  ["Plains", "ทุ่งราบ"],
  ["Savannah", "สะวันนา"],
  ["Volcanic Lands", "ดินแดนภูเขาไฟ"],
  ["Volcanic Land", "ดินแดนภูเขาไฟ"],
  ["Lava Fields", "ทุ่งลาวา"],
  ["Volcano", "ภูเขาไฟ"],
  ["Forest", "ป่า"],
  ["Woods", "พงป่า"],
  ["Sea", "ทะเล"],
  ["Ocean", "มหาสมุทร"],
  ["Mountain", "ภูเขา"],
  ["Grasslands", "ทุ่งหญ้า"],
  ["Tundra", "ทุนดรา"],
  ["Frostlands", "ดินแดนน้ำแข็ง"],
  ["Shore", "ชายฝั่ง"],
  ["Village", "หมู่บ้าน"],
  ["Town", "เมือง"],
  ["Kingdom", "อาณาจักร"],
  ["Frozen Peaks", "ยอดเขาน้ำแข็ง"],
  ["Grove", "ดงศักดิ์สิทธิ์"],
  ["Jungle", "ป่าดิบ"],
  ["River", "แม่น้ำ"],
  ["Desert", "ทะเลทราย"],
  ["Oasis", "โอเอซิส"],
  ["Canyon", "แคนยอน"],
  ["Badlands", "แบดแลนด์"],
  ["Marsh", "หนองชื้น"],
  ["Swamp", "บึง"],
  ["Wetlands", "พื้นที่ชุ่มน้ำ"],
  ["Highlands", "ที่สูง"],
  ["Cliffs", "หน้าผา"],
  ["Caverns", "ถ้ำลึก"],
  ["Crystal Caverns", "ถ้ำผลึก"],
  ["Redwood Forest", "ป่าสนแดงยักษ์"],
  ["Bamboo Forest", "ป่าไผ่"],
  ["Cherry Grove", "ดงซากุระ"],
  ["Rainforest", "ป่าฝน"],
  ["Pine Forest", "ป่าสน"],
  ["Glacier", "ธารน้ำแข็ง"],
  ["Ice Caves", "ถ้ำน้ำแข็ง"],
  ["Snowy Forest", "ป่าหิมะ"],
  ["Ashlands", "ดินแดนเถ้า"],
  ["Obsidian Wastes", "ทุ่งออบซิเดียน"],
  ["Sulfur Springs", "บ่อน้ำกำมะถัน"],
  ["Scorched Plateau", "ที่ราบสูงไหม้เกรียม"],
  ["Archipelago", "หมู่เกาะ"],
  ["Coral Coast", "ชายฝั่งปะการัง"],
  ["Coral Reef", "แนวปะการัง"],
  ["Grand Reef", "แนวปะการังใหญ่"],
  ["Mangrove", "ป่าชายเลน"],
  ["Ancient Ruins", "ซากโบราณ"],
  ["Forgotten Temple", "วิหารร้าง"],
  ["Sacred Grove", "ดงศักดิ์สิทธิ์"],
  ["Spirit Marsh", "หนองวิญญาณ"],
  ["Sunken Ruins", "ซากจมน้ำ"],
  ["Crystal Valley", "หุบเขาผลึก"],
  ["Sky Islands", "เกาะลอยฟ้า"],
  ["Steel", "เหล็ก"],
  ["Wood", "ไม้"],
  ["Leather", "หนัง"],
  ["Gemstone", "อัญมณี"],
  ["Essence", "เอสเซนซ์"],
  ["Amber", "อำพัน"],
  ["Bamboo", "ไผ่"],
  ["Coral", "ปะการัง"],
  ["Obsidian", "ออบซิเดียน"],
  ["Crystal", "ผลึก"],
  ["Blossom", "ดอกไม้"],
  ["Brimstone", "กำมะถัน"],
  ["Stormglass", "แก้วพายุ"],
  ["Balanced", "สมดุล"],
  ["Measure", "คุมระยะ"],
  ["War", "สงคราม"],
  ["Edge", "คมดาบ"],
  ["Rogue", "จอมพลิ้ว"],
  ["Anti Armor", "เจาะเกราะ"],
  ["Anti-armor", "เจาะเกราะ"],
  ["Flame", "เพลิง"],
  ["Frost", "น้ำแข็ง"],
  ["Volt", "สายฟ้า"],
  ["Terra", "ปฐพี"],
  ["Blessed", "ศักดิ์สิทธิ์"],
  ["Foundry Seal", "ตราโรงหลอม"],
  ["Greenway Compass", "เข็มทิศทางเขียว"],
  ["Sanctum Lens", "เลนส์ศักดิ์สิทธิ์"],
  ["Coastline Charm", "เครื่องรางชายฝั่ง"],
  ["Starfall Diadem", "มงกุฎดาวตก"],
  ["Duelist Step", "ก้าวนักดวล"],
  ["Threaded Point", "ปลายคมสอด"],
  ["Sweeping Rings", "วงฟันกวาด"],
  ["Tempered Weight", "น้ำหนักชุบแข็ง"],
  ["Quickdraw Latch", "ตัวล็อกชักไว"],
  ["Anchored Grip", "จับยึดมั่น"],
  ["Magnet Pommel", "พอมเมลแม่เหล็ก"],
  ["Silver Filigree", "ลายเงินประณีต"],
  ["Long March", "ก้าวยาว"],
  ["Line Feint", "เชิงลวงแนว"],
  ["Measured Grip", "กำแบบคุมระยะ"],
  ["Marching Calves", "น่องเดินทัพ"],
  ["Edge Awareness", "สำนึกคมดาบ"],
  ["Coiled Lunge", "แทงพุ่งเกร็งแรง"],
  ["Measured Approach", "เข้าระยะแม่น"],
  ["Guard Tax", "ภาระการ์ด"],
  ["Blood Rush", "เลือดพล่าน"],
  ["Narrow Gate", "ประตูแคบ"],
  ["Long Step", "ก้าวยาว"],
  ["Iron Pulse", "ชีพจรเหล็ก"],
  ["Lesson of Steel", "บทเรียนแห่งเหล็ก"],
  ["Footwork Drill", "ฝึกเท้า"],
  ["Bind Study", "ศึกษาการปัดคม"],
  ["Breathing Cadence", "จังหวะลมหายใจ"],
  ["Cutting Forms", "รูปแบบการฟัน"],
  ["Sword", "ดาบ"],
  ["Blade", "ใบดาบ"],
  ["Cross-Guard", "การ์ดขวาง"],
  ["Pommel", "พอมเมล"],
  ["Hilt", "ด้าม"],
  ["Tip", "ปลาย"],
  ["Lore", "เกร็ดเรื่อง"],
  ["Role", "บทบาท"],
  ["Adjustments", "การปรับค่า"],
  ["Traits", "คุณลักษณะ"],
  ["Status", "สถานะ"],
  ["Field Wolf", "หมาป่าทุ่ง"],
  ["Hedge Knight", "อัศวินริมพุ่ม"],
  ["Stray Hound", "หมาจรจัด"],
  ["Caravan Scout", "หน่วยลาดตระเวนคาราวาน"],
  ["Moss Bandit", "โจรมอสส์"],
  ["Antler Archer", "พลธนูเขากวาง"],
  ["Boar Tusker", "หมูป่าเขี้ยวโหด"],
  ["Owl Poacher", "พรานนกฮูก"],
  ["Grove Keeper", "ผู้พิทักษ์ดง"],
  ["Reed Caster", "นักเวทกก"],
  ["Ferry Raider", "โจรเรือข้ามฟาก"],
  ["Vine Cat", "แมวเถาวัลย์"],
  ["Dartfrog Hunter", "พรานกบพิษ"],
  ["Hyena Runner", "ไฮยีน่าฉาบฉวย"],
  ["Sun-Spear Hunter", "พรานหอกสุริยัน"],
  ["Shellback Raider", "โจรหลังเกราะ"],
  ["Gull Slinger", "มือขว้างนกนางนวล"],
  ["Deckhand Marauder", "ผู้ปล้นดาดฟ้า"],
  ["Reef Hunter", "พรานแนวปะการัง"],
  ["Snow Wolf", "หมาป่าหิมะ"],
  ["Frost Scout", "หน่วยลาดตระเวนน้ำแข็ง"],
  ["White Stag", "กวางขาว"],
  ["Peak Sentry", "ยามยอดเขา"],
  ["Goat Raider", "โจรแพะภูเขา"],
  ["Stone Mauler", "ทุบหิน"],
  ["Ash Prowler", "นักล่าเถ้า"],
  ["Slag Trooper", "ทหารสแลก"],
  ["Magma Brute", "ยักษ์แมกมา"],
  ["Militia Guard", "ยามกองอาสา"],
  ["Crossbow Watchman", "ยามหน้าไม้"],
  ["Royal Halberdier", "พลหอกหลวง"],
  ["Palace Sentinel", "ผู้เฝ้าวัง"],
  ["Field", "ทุ่ง"],
  ["Wolf", "หมาป่า"],
  ["Knight", "อัศวิน"],
  ["Scout", "หน่วยลาดตระเวน"],
  ["Bandit", "โจร"],
  ["Archer", "พลธนู"],
  ["Hunter", "พราน"],
  ["Raider", "ผู้จู่โจม"],
  ["Brute", "ยักษ์"],
  ["Guard", "ยาม"],
  ["Watchman", "ผู้เฝ้ายาม"],
  ["Halberdier", "พลฮาลเบิร์ด"],
  ["Sentinel", "ผู้พิทักษ์"],
  ["Lancer", "พลหอก"],
  ["Pikeman", "พลหอกยาว"],
  ["Bowman", "พลธนู"],
  ["Witch", "แม่มด"],
  ["Hexer", "หมอคำสาป"],
  ["Caller", "ผู้เรียก"],
  ["Trapper", "นักวางกับดัก"],
  ["Cat", "แมว"],
  ["Hound", "สุนัขล่า"],
  ["Boar", "หมูป่า"],
  ["Stag", "กวางตัวผู้"],
  ["Ram", "แกะชน"],
  ["Scorpion", "แมงป่อง"],
  ["Momentum", "โมเมนตัม"],
  ["spacing", "ระยะ"],
  ["measure", "การวัดระยะ"],
  ["tempo", "จังหวะ"],
  ["commitment", "ความทุ่ม"],
  ["recovery", "ฟื้นตัว"],
  ["parry", "ปัดคม"],
  ["bind", "ปัดคม"],
  ["binds", "การปัดคม"],
  ["thrust", "แทง"],
  ["thrusts", "การแทง"],
  ["sweep", "ฟันกวาด"],
  ["sweeps", "การฟันกวาด"],
  ["heavy", "หนัก"],
  ["light", "เบา"],
  ["stamina", "พลังงาน"],
  ["damage", "ความเสียหาย"],
  ["control", "การควบคุม"],
  ["reach", "ระยะ"],
  ["range", "ระยะ"],
  ["pressure", "แรงกดดัน"],
  ["guard", "การ์ด"],
  ["armor", "เกราะ"],
  ["combo", "คอมโบ"],
  ["dash", "พุ่ง"],
  ["movement", "การเคลื่อนที่"],
  ["footwork", "การก้าวเท้า"],
  ["speed", "ความเร็ว"],
  ["faster", "เร็วขึ้น"],
  ["slower", "ช้าลง"],
  ["stronger", "แข็งแรงขึ้น"],
  ["safer", "ปลอดภัยขึ้น"],
  ["wider", "กว้างขึ้น"],
  ["longer", "ยาวขึ้น"],
  ["shorter", "สั้นลง"],
  ["quicker", "เร็วขึ้น"],
  ["improves", "ช่วยเพิ่ม"],
  ["improve", "เพิ่ม"],
  ["improved", "ดีขึ้น"],
  ["adds", "เพิ่ม"],
  ["add", "เพิ่ม"],
  ["reduces", "ลด"],
  ["reduce", "ลด"],
  ["extends", "ขยาย"],
  ["extend", "ขยาย"],
  ["boosts", "เสริม"],
  ["boost", "เสริม"],
  ["safer defense", "การป้องกันที่ปลอดภัยขึ้น"],
  ["space control", "การคุมพื้นที่"],
  ["point control", "การคุมปลายดาบ"],
  ["forward pressure", "แรงกดดันไปข้างหน้า"],
  ["line control", "การคุมแนว"],
  ["knockback", "แรงผลัก"],
  ["lunge", "พุ่งแทง"],
  ["cleave", "ฟันผ่า"],
  ["ranged", "ระยะไกล"],
  ["perfect", "สมบูรณ์แบบ"],
  ["elite", "อีลิต"],
  ["materials", "วัสดุ"],
  ["material", "วัสดุ"],
  ["upgrade", "อัปเกรด"],
  ["upgrades", "การอัปเกรด"],
  ["weapon", "อาวุธ"],
  ["run", "รอบ"],
  ["route", "เส้นทาง"],
  ["trade", "แลกเปลี่ยน"],
  ["merchant", "พ่อค้า"],
  ["relic", "วัตถุโบราณ"],
  ["trinket", "เครื่องราง"],
  ["enchantment", "มนตร์"],
  ["forged", "หลอมสำเร็จ"],
  ["locked", "ล็อก"],
  ["sealed", "ผนึก"],
  ["owned", "ครอบครอง"],
  ["active", "ใช้งานอยู่"],
  ["current", "ปัจจุบัน"],
  ["summary", "สรุป"],
  ["detail", "รายละเอียด"],
  ["theme", "บรรยากาศ"],
  ["reward", "รางวัล"],
  ["friendly", "เป็นมิตร"],
  ["dangerous", "อันตราย"],
  ["rare", "หายาก"],
  ["late-run", "ช่วงท้ายรอบ"],
  ["early", "ช่วงต้น"],
  ["baseline", "พื้นฐาน"],
  ["versatile", "อเนกประสงค์"],
  ["stable", "มั่นคง"],
  ["dependable", "ไว้ใจได้"],
  ["aggressive", "ดุดัน"],
  ["battlefield", "สนามรบ"],
  ["pressure", "กดดัน"],
  ["leverage", "แรงงัด"],
  ["powerful", "ทรงพลัง"],
  ["space", "พื้นที่"],
  ["command", "ควบคุม"],
  ["mobile", "คล่องตัว"],
  ["brutal", "โหดหนัก"],
  ["precise", "แม่นยำ"],
  ["discipline", "วินัย"],
  ["disciplined", "มีวินัย"],
  ["reliable", "เชื่อถือได้"],
  ["balanced", "สมดุล"],
  ["rogue", "พลิ้ว"],
  ["war", "สงคราม"],
  ["edge", "คม"],
  ["anti-armor", "เจาะเกราะ"],
  ["anti armor", "เจาะเกราะ"],
  ["holy", "ศักดิ์สิทธิ์"],
  ["burn", "เผาไหม้"],
  ["cold", "เย็นเยียบ"],
  ["movement speed", "ความเร็วเคลื่อนที่"],
  ["attack pace", "จังหวะโจมตี"],
  ["incoming damage", "ความเสียหายที่ได้รับ"],
  ["heavier", "หนักขึ้น"],
  ["lighter", "เบาขึ้น"],
  ["quick", "รวดเร็ว"],
  ["slow", "ช้า"],
  ["strong", "แข็งแรง"],
  ["weaker", "อ่อนแอกว่า"],
  ["line", "แนว"],
  ["arcs", "มุมฟัน"],
  ["arc", "มุมฟัน"],
  ["strike", "ฟาด"],
  ["strikes", "การฟาด"],
  ["cuts", "การฟัน"],
  ["cut", "ฟัน"],
  ["entries", "จังหวะเข้า"],
  ["entry", "จังหวะเข้า"],
  ["defense", "การป้องกัน"],
  ["offense", "การบุก"],
  ["tempo", "จังหวะ"],
  ["poise", "ความนิ่ง"],
  ["timing", "จังหวะเวลา"],
  ["distance", "ระยะห่าง"],
  ["repositioning", "การขยับตำแหน่งใหม่"],
  ["handling", "การควบคุมมือ"],
  ["recovery", "การฟื้นตัว"],
  ["sturdier", "มั่นคงขึ้น"],
  ["graceful", "พลิ้วงาม"],
  ["mountain", "ภูเขา"],
  ["forest", "ป่า"],
  ["river", "แม่น้ำ"],
  ["volcano", "ภูเขาไฟ"],
  ["sea", "ทะเล"],
  ["ocean", "มหาสมุทร"],
  ["village", "หมู่บ้าน"],
  ["town", "เมือง"],
  ["kingdom", "อาณาจักร"],
  ["expedition", "การเดินทาง"],
  ["chapter", "บท"],
  ["arena", "สนาม"],
  ["spoils", "ของรางวัล"],
  ["broken", "พังแล้ว"],
  ["collect", "เก็บ"],
  ["overwhelmed", "เล่นงานจนพ่าย"],
  ["enemy", "ศัตรู"],
  ["tutorial", "บทสอน"],
  ["mini", "ย่อ"],
  ["world", "โลก"],
  ["map", "แผนที่"]
];

const SORTED_PHRASE_TRANSLATIONS = [...PHRASE_TRANSLATIONS].sort((left, right) => right[0].length - left[0].length);

const REGEX_TRANSLATIONS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bA\b/gi, replacement: "" },
  { pattern: /\bAn\b/gi, replacement: "" },
  { pattern: /\bThe\b/gi, replacement: "" },
  { pattern: /^HP\s/gi, replacement: "พลังชีวิต " },
  { pattern: /\bHP\b/gi, replacement: "พลังชีวิต" },
  { pattern: /\bINF\b/gi, replacement: "ไม่จำกัด" },
  { pattern: /\bSt(?=\s*\d)/g, replacement: "เหล็ก" },
  { pattern: /\bWd(?=\s*\d)/g, replacement: "ไม้" },
  { pattern: /\bLe(?=\s*\d)/g, replacement: "หนัง" },
  { pattern: /\bGe(?=\s*\d)/g, replacement: "อัญมณี" },
  { pattern: /\bEs(?=\s*\d)/g, replacement: "เอสเซนซ์" },
  { pattern: /\bAm(?=\s*\d)/g, replacement: "อำพัน" },
  { pattern: /\bBa(?=\s*\d)/g, replacement: "ไผ่" },
  { pattern: /\bCo(?=\s*\d)/g, replacement: "ปะการัง" },
  { pattern: /\bOb(?=\s*\d)/g, replacement: "ออบซิเดียน" },
  { pattern: /\bCr(?=\s*\d)/g, replacement: "ผลึก" },
  { pattern: /\bBl(?=\s*\d)/g, replacement: "ดอกไม้" },
  { pattern: /\bBr(?=\s*\d)/g, replacement: "กำมะถัน" },
  { pattern: /\bSg(?=\s*\d)/g, replacement: "แก้วพายุ" },
  { pattern: /\s+\/\s+/g, replacement: " / " },
  { pattern: /\s{2,}/g, replacement: " " },
  { pattern: /\n {1,}/g, replacement: "\n" },
  { pattern: / \./g, replacement: "." },
  { pattern: / ,/g, replacement: "," },
  { pattern: / :/g, replacement: ":" }
];

const TRANSLITERATION_PATTERNS: Array<[string, string]> = [
  ["tion", "ชั่น"],
  ["sion", "ชั่น"],
  ["ture", "เชอร์"],
  ["sure", "เชอร์"],
  ["ough", "อฟ"],
  ["augh", "อาฟ"],
  ["ight", "ไอต์"],
  ["eigh", "เอ"],
  ["ph", "ฟ"],
  ["th", "ธ"],
  ["sh", "ช"],
  ["ch", "ช"],
  ["ck", "ก"],
  ["qu", "คว"],
  ["wh", "ว"],
  ["ng", "ง"],
  ["ee", "ี"],
  ["oo", "ู"],
  ["ea", "ี"],
  ["ie", "อี"],
  ["ai", "ไอ"],
  ["ay", "เอ"],
  ["oa", "โอ"],
  ["ou", "เอา"],
  ["ow", "โอ"],
  ["oi", "อย"],
  ["oy", "อย"],
  ["au", "ออ"],
  ["ei", "เอ"],
  ["gh", "ก"],
  ["wr", "ร"],
  ["kn", "น"]
];

const TRANSLITERATION_CHARS: Record<string, string> = {
  a: "อะ",
  b: "บ",
  c: "ค",
  d: "ด",
  e: "เอ",
  f: "ฟ",
  g: "ก",
  h: "ฮ",
  i: "อิ",
  j: "จ",
  k: "ก",
  l: "ล",
  m: "ม",
  n: "น",
  o: "โอ",
  p: "พ",
  q: "ค",
  r: "ร",
  s: "ส",
  t: "ท",
  u: "อุ",
  v: "ว",
  w: "ว",
  x: "กซ",
  y: "ย",
  z: "ซ"
};

let hooksInstalled = false;
let originalSetText: ((this: Phaser.GameObjects.Text, value: string | string[]) => Phaser.GameObjects.Text) | null = null;
let originalFactoryText:
  | ((
      this: Phaser.GameObjects.GameObjectFactory,
      x: number,
      y: number,
      text: string | string[],
      style?: Phaser.Types.GameObjects.Text.TextStyle
    ) => Phaser.GameObjects.Text)
  | null = null;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function transliterateWord(word: string): string {
  let result = word.toLowerCase();

  for (const [source, target] of TRANSLITERATION_PATTERNS) {
    result = result.replace(new RegExp(escapeRegExp(source), "g"), target);
  }

  result = result.replace(/[a-z]/g, (character) => TRANSLITERATION_CHARS[character] ?? character);
  result = result.replace(/อะี/g, "อี").replace(/อะู/g, "อู").replace(/อะโอ/g, "โอ").replace(/อะอิ/g, "อิ");
  result = result.replace(/เออะ/g, "เอ").replace(/โออะ/g, "โอ");

  return result;
}

function translateRawString(value: string): string {
  if (!isThaiModeEnabled() || value.length === 0) {
    return value;
  }

  let result = EXACT_TRANSLATIONS[value] ?? value;

  if (!(value in EXACT_TRANSLATIONS)) {
    for (const [source, target] of SORTED_PHRASE_TRANSLATIONS) {
      result = result.replace(new RegExp(escapeRegExp(source), "gi"), target);
    }

    for (const rule of REGEX_TRANSLATIONS) {
      result = result.replace(rule.pattern, rule.replacement);
    }

    result = result.replace(/[A-Za-z][A-Za-z'-]*/g, (token) => transliterateWord(token));
  }

  for (const [source, target] of SORTED_PHRASE_TRANSLATIONS) {
    if (source.length <= 18) {
      result = result.replace(new RegExp(escapeRegExp(source), "gi"), target);
    }
  }

  for (const rule of REGEX_TRANSLATIONS) {
    result = result.replace(rule.pattern, rule.replacement);
  }

  return result
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ \n/g, "\n")
    .trimEnd();
}

function translateTextValue(value: string | string[]): string | string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => translateRawString(entry));
  }

  return translateRawString(String(value));
}

export function isThaiModeEnabled(): boolean {
  return gameManager.isThaiModeEnabled();
}

export function localizeTextStyle(style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.Types.GameObjects.Text.TextStyle {
  if (!isThaiModeEnabled()) {
    return style;
  }

  return {
    ...style,
    fontFamily: THAI_FONT_FAMILY
  };
}

export function translateUiText(value: string): string {
  return translateRawString(value);
}

export function applyLocalizedText(textObject: Phaser.GameObjects.Text, value: string): Phaser.GameObjects.Text {
  textObject.setText(translateRawString(value));

  if (isThaiModeEnabled()) {
    textObject.setFontFamily(THAI_FONT_FAMILY);
  }

  return textObject;
}

export function installLocalizationHooks(): void {
  if (hooksInstalled) {
    return;
  }

  hooksInstalled = true;
  originalSetText = Phaser.GameObjects.Text.prototype.setText;
  originalFactoryText = Phaser.GameObjects.GameObjectFactory.prototype.text;

  Phaser.GameObjects.Text.prototype.setText = function patchedSetText(
    this: Phaser.GameObjects.Text,
    value: string | string[]
  ): Phaser.GameObjects.Text {
    const translatedValue = translateTextValue(value);
    const result = (originalSetText as typeof Phaser.GameObjects.Text.prototype.setText).call(this, translatedValue);

    if (isThaiModeEnabled()) {
      this.setFontFamily(THAI_FONT_FAMILY);
    }

    return result;
  };

  Phaser.GameObjects.GameObjectFactory.prototype.text = function patchedFactoryText(
    this: Phaser.GameObjects.GameObjectFactory,
    x: number,
    y: number,
    text: string | string[],
    style?: Phaser.Types.GameObjects.Text.TextStyle
  ): Phaser.GameObjects.Text {
    const translatedText = translateTextValue(text);
    const localizedStyle = isThaiModeEnabled() ? localizeTextStyle(style ?? {}) : style;
    return (originalFactoryText as NonNullable<typeof originalFactoryText>).call(this, x, y, translatedText, localizedStyle);
  };
}

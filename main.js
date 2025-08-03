
// Definicija bazinių taškų reikšmių
const basePoints = {
    upsell: 1,
    newSale: 2,
    equipment: 4,
    aht: 2,
    wrapup: 4,
    gsrMobile: 4,
    gsrFix: 5
};

// Galimos boosterio parinktys
const boosterOptions = [
    // Bazinė parinktis – nenurodo boosterio
    { value: "none", label: "Nėra" },
    // 1 dienos boosteriai x2
    { value: "1dNewSale", label: "1d. New Sale ×2" },
    { value: "1dUpsell", label: "1d. Upsell ×2" },
    { value: "1dEquipment", label: "1d. Equipment ×2" },
    { value: "1dAll", label: "1d. Viskam ×2" },
    // 1 dienos boosteris x3 visiems (upsell/new sale/equipment)
    { value: "1dAllX3", label: "1d. Viskam ×3" },
    // 3 dienų boosteriai x2
    { value: "3dUpsell", label: "3d. Upsell ×2" },
    { value: "3dNewSale", label: "3d. New Sale ×2" },
    { value: "3dEquipment", label: "3d. Equipment ×2" },
    // Specialios parinktys
    { value: "remove", label: "Nuimti boosteri" },
    { value: "partner", label: "Draugas (pasirinktas)" },
    { value: "randomPartner", label: "Random draugas" },
    { value: "nextSaleX3", label: "Pirmas pardavimas ×3" }
    ,{ value: "bundleX2", label: "Bundle ×2" }
];

// Inicijuojame arba įkeliam žaidėjus. Pereiname prie naujos struktūros, kur
// vietoj „activeBooster“ naudojamas masyvas „activeBoosters“.
function loadPlayers() {
    let stored = localStorage.getItem('players');
    if (stored) {
        const parsed = JSON.parse(stored);
        parsed.forEach(p => {
            // Jei senoje struktūroje yra activeBooster, perkeliam į masyvą
            if (!p.hasOwnProperty('activeBoosters')) {
                p.activeBoosters = [];
                if (p.activeBooster && p.activeBooster.type && p.activeBooster.type !== 'none') {
                    p.activeBoosters.push(p.activeBooster);
                }
                delete p.activeBooster;
            }
            // jei nėra partnerio lauko
            if (!p.hasOwnProperty('partner')) {
                p.partner = null;
            }
            // jei nėra achievements objekto
            if (!p.hasOwnProperty('achievements')) {
                p.achievements = {};
            }
            // jei nėra boosterUsageCount, lootDrawn ir history
            if (!p.hasOwnProperty('boosterUsageCount')) {
                p.boosterUsageCount = 0;
            }
            if (!p.hasOwnProperty('lootDrawn')) {
                p.lootDrawn = false;
            }
            if (!p.hasOwnProperty('pointsHistory')) {
                p.pointsHistory = [];
            }
        });
        return parsed;
    } else {
        // Jei localStorage duomenų nėra, pradedame su numatytais vardais
        const defaultNames = ['Tomas', 'Giulija', 'Dovilė', 'Lukas', 'Matas', 'Rytis', 'Viktorija'];
        const defaultPlayers = defaultNames.map((nm, idx) => ({
            id: idx,
            name: nm,
            points: 0,
            activeBoosters: [],
            partner: null,
            achievements: {},
            boosterUsageCount: 0,
            lootDrawn: false,
            pointsHistory: []
        }));
        return defaultPlayers;
    }
}

let players = loadPlayers();

// Saugome ankstesnę žaidėjų tvarką pagal ID, kad galėtume nustatyti kilimą į aukštesnę poziciją
let previousOrder = players.map(p => p.id);

// Valdiklis, ar kitą kartą atnaujinant lentelę reikia rodyti animaciją. Nustatomas, kai keičiasi taškai.
let enableAnimationOnNextRender = false;

function savePlayers() {
    localStorage.setItem('players', JSON.stringify(players));
}

// Atvaizduojame lentelę
function renderTable() {
    const tbody = document.getElementById('playersBody');
    // 1. Išsaugome senų eilučių (pagal data-id) top pozicijas
    const oldRows = Array.from(tbody.querySelectorAll('tr'));
    const oldTops = {};
    oldRows.forEach(row => {
        if (row.dataset.id) oldTops[row.dataset.id] = row.getBoundingClientRect().top;
    });

    // 2. Perpiešiame lentelę kaip įprasta
    tbody.innerHTML = '';
    const sortedPlayers = [...players].sort((a, b) => b.points - a.points);
    sortedPlayers.forEach((player, index) => {
        const tr = document.createElement('tr');
        tr.dataset.id = player.id;

        // Vardas (redaguojamas)
        const nameTd = document.createElement('td');
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = player.name;
        nameInput.onchange = (e) => {
            player.name = e.target.value;
            savePlayers();
            renderTable();
        };
        nameTd.appendChild(nameInput);
        tr.appendChild(nameTd);

        // Taškai
        const pointsTd = document.createElement('td');
        pointsTd.textContent = player.points;
        tr.appendChild(pointsTd);

        // Pasiekimai
        const achTd = document.createElement('td');
        if (!player.achievements) player.achievements = {};
        function createAchTag(text, cls) {
            const span = document.createElement('span');
            span.className = 'achievement-tag ' + (cls || '');
            span.textContent = text;
            return span;
        }
        if (player.achievements.twentyPoints) achTd.appendChild(createAchTag('🥇20', 'twenty'));
        if (player.achievements.fiveBoosters) achTd.appendChild(createAchTag('🔥5', 'five'));
        if (player.achievements.firstLoot) achTd.appendChild(createAchTag('🎉', 'loot'));
        tr.appendChild(achTd);

        // Mygtukai veikloms – plius ir minus
        const activities = Object.keys(basePoints);
        activities.forEach((act) => {
            const td = document.createElement('td');
            // plius
            const plusBtn = document.createElement('button');
            plusBtn.className = 'small';
            plusBtn.textContent = '+';
            plusBtn.title = `Pridėti taškus už ${act}`;
            plusBtn.onclick = () => addPoints(player.id, act);
            td.appendChild(plusBtn);
            // minus
            const minusBtn = document.createElement('button');
            minusBtn.className = 'small';
            minusBtn.textContent = '−';
            minusBtn.title = `Atimti taškus už ${act}`;
            minusBtn.onclick = () => subtractPoints(player.id, act);
            td.appendChild(minusBtn);
            tr.appendChild(td);
        });

        // Aktyvių booster'ių sąrašas
        const boosterListTd = document.createElement('td');
        boosterListTd.id = `boosterList-${player.id}`;
        tr.appendChild(boosterListTd);

        // Partneris
        const partnerTd = document.createElement('td');
        const partnerSelect = document.createElement('select');
        const noneOption = document.createElement('option');
        noneOption.value = '';
        noneOption.textContent = '—';
        partnerSelect.appendChild(noneOption);
        players.forEach(p => {
            if (p.id !== player.id) {
                const option = document.createElement('option');
                option.value = p.id;
                option.textContent = p.name;
                partnerSelect.appendChild(option);
            }
        });
        partnerSelect.value = player.partner !== null ? player.partner : '';
        partnerSelect.onchange = (e) => {
            const newPartnerId = e.target.value === '' ? null : parseInt(e.target.value);
            const oldPartnerId = player.partner;
            player.partner = newPartnerId;
            if (oldPartnerId !== null && oldPartnerId !== undefined && oldPartnerId !== newPartnerId) {
                const oldPartner = players.find(p => p.id === oldPartnerId);
                if (oldPartner) {
                    oldPartner.activeBoosters = Array.isArray(oldPartner.activeBoosters)
                        ? oldPartner.activeBoosters.filter(b => b.type !== 'partner')
                        : [];
                    oldPartner.partner = null;
                }
            }
            if (Array.isArray(player.activeBoosters)) {
                const partnerBooster = player.activeBoosters.find(b => b.type === 'partner');
                if (partnerBooster && newPartnerId !== null) {
                    const newPartner = players.find(p => p.id === newPartnerId);
                    if (newPartner) {
                        newPartner.activeBoosters = Array.isArray(newPartner.activeBoosters)
                            ? newPartner.activeBoosters.filter(b => b.type !== 'partner')
                            : [];
                        newPartner.activeBoosters.push({
                            type: 'partner',
                            expires: partnerBooster.expires,
                            pending: false
                        });
                        newPartner.partner = player.id;
                    }
                }
            }
            savePlayers();
            renderTable();
        };
        partnerTd.appendChild(partnerSelect);
        tr.appendChild(partnerTd);

        // Booster select
        const boosterTd = document.createElement('td');
        boosterTd.className = 'new-booster-column';
        const boosterSelect = document.createElement('select');
        boosterOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            boosterSelect.appendChild(option);
        });
        boosterSelect.value = 'none';
        boosterSelect.onchange = (e) => {
            const val = e.target.value;
            if (val && val !== 'none') {
                setBooster(player.id, val);
                boosterSelect.value = 'none';
            }
        };
        boosterTd.appendChild(boosterSelect);
        tr.appendChild(boosterTd);

        tbody.appendChild(tr);
        renderBoosterList(player.id);
    });

    // 3. Po DOM atnaujinimo – pritaikome FLIP animaciją
    // (requestAnimationFrame užtikrina, kad browser jau atvaizduotų naują DOM)
    requestAnimationFrame(() => {
        const newRows = Array.from(tbody.querySelectorAll('tr'));
        newRows.forEach(row => {
            const id = row.dataset.id;
            const oldTop = oldTops[id];
            const newTop = row.getBoundingClientRect().top;
            if (oldTop !== undefined) {
                const delta = oldTop - newTop;
                if (delta) {
                    row.style.transform = `translateY(${delta}px)`;
                    row.classList.add('smooth-move');
                    requestAnimationFrame(() => {
                        row.style.transform = '';
                    });
                    row.addEventListener('transitionend', () => {
                        row.classList.remove('smooth-move');
                    }, { once: true });
         
        
 

    // Atvaizduojame aktyvių booster'ių žymes
    sortedPlayers.forEach(player => {
        renderBoosterList(player.id);
    });

    // Atnaujiname previousOrder nauja žaidėjų tvarka
    previousOrder = sortedPlayers.map(p => p.id);
    // Animacijos vėliava tik vienam atnaujinimui
    enableAnimationOnNextRender = false;
}

// Atnaujiname boosterio informacijos tekstą
function updateBoosterInfo(playerId) {
    const player = players.find(p => p.id === playerId);
    const el = document.getElementById(`boosterInfo-${playerId}`);
    if (!el) return;
    if (!player.activeBoosters || player.activeBoosters.length === 0) {
        el.textContent = '';
        return;
    }
    const now = new Date();
    const parts = [];
    // helper to get label from boosterOptions
    const getLabel = (type) => {
        const opt = boosterOptions.find(o => o.value === type);
        return opt ? opt.label : type;
    };
    player.activeBoosters.forEach(b => {
        let part = '';
        if (b.type === 'partner') {
            // Naparnikas: rodom partnerio vardą ir galiojimo laiką
            const partnerName = player.partner !== null ? players.find(p => p.id === player.partner)?.name : '';
            part += `Naparnikas: ${partnerName || ''}`;
        } else if (b.type === 'nextSaleX3' && b.pending) {
            part += 'Kitas pardavimas ×3 (aktyvus)';
        } else {
            part += getLabel(b.type);
        }
        if (b.expires) {
            const expDate = new Date(b.expires);
            const daysLeft = Math.ceil((expDate - now) / (24*60*60*1000));
            if (daysLeft >= 0) {
                part += ` – iki ${expDate.toLocaleDateString()} (liko ${daysLeft} d.)`;
            }
        }
        parts.push(part);
    });
    el.textContent = parts.join(' | ');
}

// Parodo aktyvius booster'ius kaip žymes su pašalinimo mygtuku
function renderBoosterList(playerId) {
    const player = players.find(p => p.id === playerId);
    const cell = document.getElementById(`boosterList-${playerId}`);
    if (!cell) return;
    cell.innerHTML = '';
    if (!player.activeBoosters || player.activeBoosters.length === 0) return;
    const now = new Date();
    // pagalbinė funkcija gauti pavadinimą iš boosterOptions
    const getLabel = (type) => {
        const opt = boosterOptions.find(o => o.value === type);
        return opt ? opt.label : type;
    };
    player.activeBoosters.forEach(b => {
        const span = document.createElement('span');
        span.className = 'booster-tag';
        let text = '';
        // Nustatome rodomą tekstą pagal boosterio tipą
        if (b.type === 'partner') {
            const partnerName = player.partner !== null ? players.find(p => p.id === player.partner)?.name : '';
            text = `Draugas: ${partnerName || ''}`;
        } else if (b.type === 'nextSaleX3' && b.pending) {
            text = 'Pirmas pardavimas ×3';
        } else if (b.type === 'bundleX2') {
            text = getLabel('bundleX2');
            // jei dar neaktyvuotas, neatskleidžiame būsenos; jei aktyvuotas, pridedame žymę
            if (b.pending) {
                text += ' (aktyvuota)';
            }
        } else {
            text = getLabel(b.type);
        }
        // pridėti datos info, jei nustatytas galiojimas
        if (b.expires) {
            const expDate = new Date(b.expires);
            const daysLeft = Math.ceil((expDate - now) / (24*60*60*1000));
            if (daysLeft >= 0) {
                text += ` (liko ${daysLeft} d.)`;
            }
        }
        span.textContent = text;
        // jei tai bundleX2 ir dar neaktyvuotas, pridedame aktyvavimo mygtuką
        if (b.type === 'bundleX2' && !b.pending) {
            const activateBtn = document.createElement('button');
            activateBtn.textContent = '✓';
            activateBtn.title = 'Aktyvuoti bundle ×2';
            activateBtn.onclick = () => {
                // pažymime boosterį kaip aktyvuotą ir išsaugome
                b.pending = true;
                savePlayers();
                renderTable();
            };
            span.appendChild(activateBtn);
        }
        // mygtukas pašalinti
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.title = 'Nuimti šį boosteri';
        removeBtn.onclick = () => removeBooster(player.id, b.type);
        span.appendChild(removeBtn);
        cell.appendChild(span);
    });
}

function removeBooster(playerId, boosterType) {
    const player = players.find(p => p.id === playerId);
    if (!Array.isArray(player.activeBoosters)) return;
    player.activeBoosters = player.activeBoosters.filter(b => b.type !== boosterType);
    // Jei nuimame naparniko (partner) boosterį, nuimame jį ir iš partnerio
    if (boosterType === 'partner') {
        const partnerId = player.partner;
        // nuimame ryšį
        player.partner = null;
        if (partnerId !== null && partnerId !== undefined) {
            const partner = players.find(p => p.id === partnerId);
            if (partner) {
                partner.activeBoosters = Array.isArray(partner.activeBoosters)
                    ? partner.activeBoosters.filter(b => b.type !== 'partner')
                    : [];
                partner.partner = null;
            }
        }
    }
    savePlayers();
    renderTable();
}

// Nustatome boosterį žaidėjui
function setBooster(playerId, type) {
    const player = players.find(p => p.id === playerId);
    // initialise activeBoosters array if missing
    if (!Array.isArray(player.activeBoosters)) {
        player.activeBoosters = [];
    }
    // jei pasirenkama "none" arba "remove" – išvalome visus booster'ius ir nutraukiame naparniko ryšį.
    if (type === 'none' || type === 'remove') {
        // jei žaidėjas turi naparniko boosterį, nuimame jį simetriškai abiem žaidėjams
        const hasPartnerBooster = Array.isArray(player.activeBoosters) && player.activeBoosters.some(b => b.type === 'partner');
        if (hasPartnerBooster) {
            removeBooster(playerId, 'partner');
        }
        // pašaliname visus likusius booster'ius ir išvalome partnerio nuorodą
        player.activeBoosters = [];
        player.partner = null;
    } else if (type === 'partner' || type === 'randomPartner') {
        // pašaliname ankstesnį naparniko boosterį
        player.activeBoosters = player.activeBoosters.filter(b => b.type !== 'partner');
        // Naparniko boosterio trukmė – 1 diena
        const expiry = new Date(Date.now() + 1*24*60*60*1000).toISOString();
        // pridedame naują naparniko boosterį su galiojimo data 1 d.
        player.activeBoosters.push({
            type: 'partner',
            expires: expiry,
            pending: false
        });
        // partnerio priskyrimas: jei random – renkamės atsitiktinį kitą žaidėją
        if (type === 'randomPartner') {
            const others = players.filter(p => p.id !== player.id);
            const rand = others[Math.floor(Math.random() * others.length)];
            // nustatome partnerį
            player.partner = rand.id;
            // taip pat suteikiame naparniko boosterį partneriui
            const partner = players.find(p => p.id === player.partner);
            if (partner) {
                // pašaliname esamą naparniko boosterį iš partnerio
                partner.activeBoosters = Array.isArray(partner.activeBoosters)
                    ? partner.activeBoosters.filter(b => b.type !== 'partner')
                    : [];
                partner.activeBoosters.push({
                    type: 'partner',
                    expires: expiry,
                    pending: false
                });
                // nustatome atgalinį partnerį
                partner.partner = player.id;
            }
        }
        // jei nėra randomPartner, partnerį parenka vartotojas dropdown'e – simetriškas priskyrimas bus atliktas partnerSelect.onchange
    } else if (type === 'nextSaleX3') {
        // panaikiname seną nextSale boosterį (jei yra)
        player.activeBoosters = player.activeBoosters.filter(b => b.type !== 'nextSaleX3');
        player.activeBoosters.push({ type: 'nextSaleX3', expires: null, pending: true });
    } else if (type === 'bundleX2') {
        // pašaliname seną bundle boosterį (jei yra) ir pridedame naują. "pending" nurodo, ar boosteris suaktyvintas.
        player.activeBoosters = player.activeBoosters.filter(b => b.type !== 'bundleX2');
        player.activeBoosters.push({ type: 'bundleX2', expires: null, pending: false });
    } else {
        // 1d ir 3d boosteriai
        let duration;
        if (type.startsWith('1d')) duration = 1;
        else if (type.startsWith('3d')) duration = 3;
        // pašaliname ankstesnį tokio paties tipo boosterį
        player.activeBoosters = player.activeBoosters.filter(b => b.type !== type);
        player.activeBoosters.push({
            type: type,
            expires: new Date(Date.now() + duration*24*60*60*1000).toISOString(),
            pending: false
        });
    }
    // Boosteris buvo priskirtas – jei tai ne "none" ir ne "remove", skaičiuojame pasiekimams
    if (type !== 'none' && type !== 'remove') {
        if (player.boosterUsageCount === undefined) player.boosterUsageCount = 0;
        player.boosterUsageCount++;
        // Pasiekimas: 5 boosteriai
        if (player.boosterUsageCount >= 5) {
            if (!player.achievements) player.achievements = {};
            if (!player.achievements.fiveBoosters) {
                player.achievements.fiveBoosters = true;
            }
        }
    }
    savePlayers();
    renderTable();
}

// Skaičiuojame ir pridedame taškus su active boosteriu ir partneriu
function addPoints(playerId, activityKey) {
    const player = players.find(p => p.id === playerId);
    const base = basePoints[activityKey] || 0;
    const now = new Date();
    // Pašaliname pasibaigusius booster'ius
    let expiredRemoved = false;
    if (!Array.isArray(player.activeBoosters)) {
        player.activeBoosters = [];
    }
    const validBoosters = [];
    player.activeBoosters.forEach(b => {
        if (b.expires && new Date(b.expires) < now) {
            expiredRemoved = true;
        } else {
            validBoosters.push(b);
        }
    });
    if (expiredRemoved) {
        player.activeBoosters = validBoosters;
    }
    // Nustatome partnerio statusą ir daugiklį
    let partnerActive = false;
    let multiplier = 1;
    let usedNextSale = false;
    let usedBundle = false;
    player.activeBoosters.forEach(b => {
        switch (b.type) {
            case 'partner':
                partnerActive = true;
                break;
            case '1dNewSale':
                if (activityKey === 'newSale') multiplier = Math.max(multiplier, 2);
                break;
            case '1dEquipment':
                if (activityKey === 'equipment') multiplier = Math.max(multiplier, 2);
                break;
            case '1dAll':
                if (['upsell','newSale','equipment'].includes(activityKey)) multiplier = Math.max(multiplier, 2);
                break;
            case '1dAllX3':
                if (['upsell','newSale','equipment'].includes(activityKey)) multiplier = Math.max(multiplier, 3);
                break;
            case '1dUpsell':
                if (activityKey === 'upsell') multiplier = Math.max(multiplier, 2);
                break;
            case '3dUpsell':
                if (activityKey === 'upsell') multiplier = Math.max(multiplier, 2);
                break;
            case '3dNewSale':
                if (activityKey === 'newSale') multiplier = Math.max(multiplier, 2);
                break;
            case '3dEquipment':
                if (activityKey === 'equipment') multiplier = Math.max(multiplier, 2);
                break;
            case 'nextSaleX3':
                if (['upsell','newSale','equipment'].includes(activityKey) && b.pending) {
                    multiplier = Math.max(multiplier, 3);
                    usedNextSale = true;
                }
                break;
            case 'bundleX2':
                if (['upsell','newSale','equipment'].includes(activityKey) && b.pending) {
                    multiplier = Math.max(multiplier, 2);
                    usedBundle = true;
                }
                break;
            default:
                break;
        }
    });
    // priskiriame taškus
    const playerPts = base * multiplier;
    player.points += playerPts;
    // įrašome į istoriją
    if (!Array.isArray(player.pointsHistory)) player.pointsHistory = [];
    player.pointsHistory.push({ date: now.toISOString(), change: playerPts, points: player.points });
    // partneriui skiriami baziniai taškai
    if (partnerActive && player.partner !== null) {
        const partner = players.find(p => p.id === player.partner);
        if (partner) {
            partner.points += base;
            // įrašome partnerio istoriją
            if (!Array.isArray(partner.pointsHistory)) partner.pointsHistory = [];
            partner.pointsHistory.push({ date: now.toISOString(), change: base, points: partner.points });
        }
    }
    // jei panaudojome nextSaleX3 ar bundleX2, pašaliname atitinkamus booster'ius
    if (usedNextSale) {
        player.activeBoosters = player.activeBoosters.filter(b => b.type !== 'nextSaleX3');
    }
    if (usedBundle) {
        player.activeBoosters = player.activeBoosters.filter(b => b.type !== 'bundleX2');
    }
    // Patikriname pasiekimus – 20 taškų
    if (player.points >= 20 && (!player.achievements || !player.achievements.twentyPoints)) {
        if (!player.achievements) player.achievements = {};
        player.achievements.twentyPoints = true;
    }
    savePlayers();
    renderTable();

    // Nustatome, kad kitą kartą rodytų animaciją (žaidėjas galėjo pakilti)
    enableAnimationOnNextRender = true;
}

// Atima bazinius taškus pagal veiklą (be boosterio)
function subtractPoints(playerId, activityKey) {
    const player = players.find(p => p.id === playerId);
    const pts = basePoints[activityKey] || 0;
    // Atimame iš žaidėjo
    const beforePts = player.points;
    player.points = Math.max(0, player.points - pts);
    const changeAmt = player.points - beforePts;
    // Į istoriją (neigiamas pokytis)
    if (!Array.isArray(player.pointsHistory)) player.pointsHistory = [];
    player.pointsHistory.push({ date: new Date().toISOString(), change: changeAmt, points: player.points });
    // Jei turi partnerį – atimame ir jam
    if (player.partner !== null) {
        const partner = players.find(p => p.id === player.partner);
        if (partner) {
            const before = partner.points;
            partner.points = Math.max(0, partner.points - pts);
            const diff = partner.points - before;
            if (!Array.isArray(partner.pointsHistory)) partner.pointsHistory = [];
            partner.pointsHistory.push({ date: new Date().toISOString(), change: diff, points: partner.points });
        }
    }
    savePlayers();
    renderTable();

    // Nustatome, kad kitą atnaujinimą rodytų animaciją (reitingas galėjo pasikeisti)
    enableAnimationOnNextRender = true;
}

// Atvaizduojame pradinę lentelę įkrovus
renderTable();

// Periodiškai tikriname boosterio galiojimo laiką ir atnaujiname
setInterval(() => {
    let changed = false;
    const now = new Date();
    players.forEach(player => {
        if (!Array.isArray(player.activeBoosters)) return;
        // Pirmiausia tikriname, ar yra pasibaigęs naparniko boosteris
        const expiredPartner = player.activeBoosters.some(b => b.type === 'partner' && b.expires && new Date(b.expires) < now);
        if (expiredPartner) {
            // jei naparniko galiojimas baigėsi, nuimame jį abiem žaidėjams naudodami removeBooster
            removeBooster(player.id, 'partner');
            changed = true;
        }
        // Tada pašaliname visus kitus pasibaigusius booster'ius (išskyrus partnerį, nes jis jau nuimtas aukščiau)
        const before = player.activeBoosters.length;
        player.activeBoosters = player.activeBoosters.filter(b => {
            if (b.type === 'partner') return true; // partneris tvarkomas atskirai
            return !(b.expires && new Date(b.expires) < now);
        });
        if (player.activeBoosters.length !== before) {
            changed = true;
        }
    });
    if (changed) {
        savePlayers();
        renderTable();
    }
    // Patikriname savaitės ir mėnesio pabaigą automatinio išsikrovimo valdymui
    checkResets();
}, 60 * 1000); // kas minutę

// Tikrina ar reikia atlikti automatinius resetus (savaitinis ir mėnesinis)
function checkResets() {
    const now = new Date();
    // Savaitės resetas: jei šiandien pirmadienis
    const day = now.getDay();
    // getDay(): 0-sekmadienis, 1-pirmadienis, ... 6-šeštadienis
    const currentWeekMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
    const lastWeekReset = localStorage.getItem('lastWeeklyReset');
    if (day === 1) {
        if (!lastWeekReset || new Date(lastWeekReset).toDateString() !== currentWeekMonday.toDateString()) {
            // atlikti savaitės resetą: nuimame visus booster'ius ir partnerius
            players.forEach(p => {
                p.activeBoosters = [];
                p.partner = null;
            });
            localStorage.setItem('lastWeeklyReset', currentWeekMonday.toISOString());
            savePlayers();
            renderTable();
        }
    }
    // Mėnesio resetas: jei pirmoji mėnesio diena
    if (now.getDate() === 1) {
        const currentMonth = now.getFullYear() + '-' + (now.getMonth() + 1);
        const lastMonthReset = localStorage.getItem('lastMonthlyReset');
        if (!lastMonthReset || lastMonthReset !== currentMonth) {
            // atlikti mėnesio resetą: nuimame booster'ius
            players.forEach(p => {
                p.activeBoosters = [];
                p.partner = null;
            });
            localStorage.setItem('lastMonthlyReset', currentMonth);
            savePlayers();
            renderTable();
        }
    }
}

// Nulinti visų žaidėjų taškus
document.getElementById('resetButton').addEventListener('click', () => {
    if (confirm('Ar tikrai norite nunulinti visų taškus?')) {
        players.forEach(p => {
            p.points = 0;
        });
        savePlayers();
        renderTable();
    }
});

// ====== Loot box funkcionalumas ======
// Duomenų sąrašas – kiekvieno boosterio kiekis ir etiketė
const lootTable = [
    { type: '1dNewSale', label: '1d. New Sale ×2', qty: 12, rarity: 'common' },
    { type: '1dUpsell', label: '1d. Upsell ×2', qty: 10, rarity: 'uncommon' },
    { type: '1dEquipment', label: '1d. Equipment ×2', qty: 12, rarity: 'common' },
    { type: 'remove', label: 'Nuimti boosteri', qty: 5, rarity: 'rare' },
    { type: '3dNewSale', label: '3d. New Sale ×2', qty: 5, rarity: 'rare' },
    { type: '3dUpsell', label: '3d. Upsell ×2', qty: 5, rarity: 'rare' },
    { type: '3dEquipment', label: '3d. Equipment ×2', qty: 5, rarity: 'rare' },
    { type: '1dAll', label: '1d. Viskam ×2', qty: 3, rarity: 'epic' },
    { type: '1dAllX3', label: '1d. Viskam ×3', qty: 1, rarity: 'legendary' },
    { type: 'partner', label: 'Draugas (pasirinktas)', qty: 10, rarity: 'uncommon' },
    { type: 'randomPartner', label: 'Random draugas', qty: 10, rarity: 'uncommon' },
    { type: 'nextSaleX3', label: 'Pirmas pardavimas ×3', qty: 10, rarity: 'uncommon' },
    { type: 'bundleX2', label: 'Bundle ×2', qty: 12, rarity: 'common' }
];
const lootTotalQty = lootTable.reduce((sum, item) => sum + item.qty, 0);

// Rūšies priskyrimas pagal kiekį
function lootAssignRarity(qty) {
    // Priskiriame retumą pagal kiekį. Daugiausia vnt. – dažniausiai (Common),
    // vidutiniai – Rare, du vienetai – Epic, vienas vienetas – Legendary
    if (qty >= 5) return 'Common';
    if (qty >= 3) return 'Rare';
    if (qty === 2) return 'Epic';
    return 'Legendary';
}

// Užpildo tikimybių lentelę loot box skiltyje
function populateLootProbTable() {
    const tbody = document.getElementById('lootProbTable');
    if (!tbody) return;
    tbody.innerHTML = '';
    const lootTotalQty = lootTable.reduce((sum, item) => sum + item.qty, 0);
    // Rikiuoti pagal procentą (mažiausias aukščiau)
    const sorted = [...lootTable].sort((a, b) => {
        const probA = a.qty / lootTotalQty;
        const probB = b.qty / lootTotalQty;
        if (probA !== probB) return probA - probB;
        const order = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
        return order[a.rarity] - order[b.rarity];
    });
    sorted.forEach(item => {
        const prob = ((item.qty / lootTotalQty) * 100).toFixed(1);
        const tr = document.createElement('tr');
        tr.className = item.rarity;
        tr.innerHTML = `<td>${item.label}</td>
                        <td>${item.qty}</td>
                        <td>${prob}%</td>
                        <td>${item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}</td>`;
        tbody.appendChild(tr);
    });
}

// Užpildo žaidėjų pasirinkimą loot box skiltyje
function populateLootPlayerSelect() {
    const select = document.getElementById('lootPlayerSelect');
    if (!select) return;
    select.innerHTML = '';
    // Surikiuojame žaidėjus pagal taškus (daugiausia – pirmasis)
    const sorted = [...players].sort((a, b) => b.points - a.points);
    sorted.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.name} (${p.points})`;
        select.appendChild(option);
    });
}

// Pasirenka atsitiktinį boosterį pagal svorį
function pickRandomLootBooster() {
    let rand = Math.random() * lootTotalQty;
    for (const item of lootTable) {
        if (rand < item.qty) {
            return item.type;
        }
        rand -= item.qty;
    }
    // Saugiklis, jei kažkas blogai
    return lootTable[0].type;
}


// Parodo loot box skiltį ir paslepia pagrindinę lentelę
function showLootBox() {
    // Atnaujiname žaidėjų pasirinkimą ir tikimybių lentelę
    populateLootPlayerSelect();
    populateLootProbTable();
    // Slėpti pagrindinę lentelę ir su tuo susijusius elementus
    document.getElementById('scoreboard').style.display = 'none';
    document.getElementById('resetButton').style.display = 'none';
    // Parodyti loot box
    const lootDiv = document.getElementById('lootBoxSection');
    if (lootDiv) lootDiv.style.display = 'block';
    // Išvalyti rezultatą
    const res = document.getElementById('lootResult');
    if (res) res.textContent = '';
    // Priskirti mygtuko click įvykį
    const btn = document.getElementById('lootDrawButton');
    if (btn) {
        btn.onclick = drawFromLootBox;
    }

    // Paslėpti nuorodą į Loot box, kad nebesimatytų būnant šioje skiltyje
    const lootLink = document.getElementById('lootLink');
    if (lootLink) lootLink.style.display = 'none';

    // Taip pat paslėpti nuorodą į Marketplace
    const marketLink = document.getElementById('marketLink');
    if (marketLink) marketLink.style.display = 'none';

    // Slėpti naujo boosterio stulpelio jungiklį, nes jis nereikalingas loot boxe
    const tbc = document.getElementById('toggleBoosterContainer');
    if (tbc) tbc.style.display = 'none';

    // Slėpti naujo boosterio stulpelį nepriklausomai nuo vartotojo nustatymo
    document.body.classList.add('hide-new-booster');
}

// Paslepia loot box skiltį ir grąžina į taškų sekimo lentelę
function hideLootBox() {
    // Rodyti pagrindinę lentelę ir mygtuką
    document.getElementById('scoreboard').style.display = '';
    document.getElementById('resetButton').style.display = '';
    // Slėpti loot box sekciją
    const lootDiv = document.getElementById('lootBoxSection');
    if (lootDiv) lootDiv.style.display = 'none';

    // Parodyti nuorodą į Loot box, kai grįžtame į pagrindinę lentelę
    const lootLink = document.getElementById('lootLink');
    if (lootLink) lootLink.style.display = '';

    // Parodyti nuorodą į Marketplace, kai grįžtame į pagrindinę lentelę
    const marketLink = document.getElementById('marketLink');
    if (marketLink) marketLink.style.display = '';

    // Parodyti naujo boosterio stulpelio jungiklį vėl
    const tbc = document.getElementById('toggleBoosterContainer');
    if (tbc) tbc.style.display = 'inline-flex';
    // Atkurti naujo boosterio stulpelio matomumą pagal vartotojo checkbox'ą
    toggleBoosterColumnVisibility();
}

// Pagrindinė loot box traukimo funkcija
let lootInProgress = false;

function drawFromLootBox() {
    const select = document.getElementById('lootPlayerSelect');
    const resultEl = document.getElementById('lootResult');
    const btn = document.getElementById('lootDrawButton');
    if (!select || !resultEl || !btn) return;
    if (lootInProgress) return; // neleidžiame kelis kartus
    const playerId = parseInt(select.value);
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    if (player.points < 5) {
        alert('Pasirinktas žaidėjas neturi pakankamai taškų (reikia 5).');
        return;
    }
    // Pažymime, kad prasidėjo traukimas
    lootInProgress = true;
    // Sumažiname taškus iškart
    player.points -= 5;
    savePlayers();
    renderTable();
    // Parenkame atsitiktinį boosterį, bet nepriskiriame dar
    const boosterType = pickRandomLootBooster();
    const label = lootTable.find(item => item.type === boosterType)?.label || boosterType;
    // Rodome skrynią ir prizą be papildomo laukimo (sukimosi) – iškart atidarome skrynią, prizas išnyra
    // Pritaikome boosterį ir atnaujiname lentelę
    setBooster(playerId, boosterType);
    // Pažymime, kad žaidėjas ištraukė iš loot box – pasiekimas
    if (!player.lootDrawn) {
        player.lootDrawn = true;
        if (!player.achievements) player.achievements = {};
        player.achievements.firstLoot = true;
    }
    savePlayers();
    renderTable();
    // Sukuriame skrynią ir paslėptą prizą (prizas pasirodys per CSS animaciją)
    resultEl.innerHTML =
        '<div class="loot-chest">' +
        '  <div class="chest-lid"></div>' +
        '  <div class="chest-body"></div>' +
        '  <div class="gold"></div>' +
        '  <div class="gold gold2"></div>' +
        '  <div class="gold gold3"></div>' +
        '  <div class="sparks">' +
        '    <div class="spark"></div>' +
        '    <div class="spark"></div>' +
        '    <div class="spark"></div>' +
        '    <div class="spark"></div>' +
        '    <div class="spark"></div>' +
        '  </div>' +
        '</div>' +
        '<div class="prize-label">Ištrauktas boosteris: ' + label + '</div>';
    // Išjungiame mygtuką ir leidžiame animacijai pasibaigti (~7 s su žybsniais)
    btn.disabled = true;
    // Atnaujinkime žaidėjų sąrašą loot boxe, kad rodytų naujus taškus
    populateLootPlayerSelect();
    setTimeout(() => {
        // Pasibaigus žybsniams įgaliname mygtuką
        btn.disabled = false;
        lootInProgress = false;
        // Paslėpti kibirkštis po 7 s
        const sparksContainer = resultEl.querySelector('.sparks');
        if (sparksContainer) sparksContainer.style.display = 'none';
    }, 7000);
}

// ====== Marketplace funkcionalumas ======
// Užpildo žaidėjų pasirinkimo sąrašą Marketplace skiltyje
function populateMarketPlayerSelect() {
    const select = document.getElementById('marketPlayerSelect');
    if (!select) return;
    select.innerHTML = '';
    const sorted = [...players].sort((a, b) => b.points - a.points);
    sorted.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.name} (${p.points})`;
        select.appendChild(option);
    });
}

// Parodo Marketplace skiltį ir paslepia kitą turinį
function showMarketplace() {
    // Atnaujinti žaidėjų pasirinkimą
    populateMarketPlayerSelect();
    // Slėpti pagrindinę lentelę ir su tuo susijusius elementus
    document.getElementById('scoreboard').style.display = 'none';
    document.getElementById('resetButton').style.display = 'none';
    // Slėpti Loot box ir Market nuorodas
    const lootLink = document.getElementById('lootLink');
    if (lootLink) lootLink.style.display = 'none';
    const marketLink = document.getElementById('marketLink');
    if (marketLink) marketLink.style.display = 'none';
    // Paslėpti loot box skyrių, jei buvo atidarytas
    const lootDiv = document.getElementById('lootBoxSection');
    if (lootDiv) lootDiv.style.display = 'none';
    // Parodyti Marketplace
    const mDiv = document.getElementById('marketplaceSection');
    if (mDiv) mDiv.style.display = 'block';
    // Išvalyti rezultatų tekstą
    const res = document.getElementById('marketResult');
    if (res) res.textContent = '';
    // Priskirti paspaudimų įvykius pirkimo mygtukams
    const buttons = document.querySelectorAll('.buyBtn');
    buttons.forEach(btn => {
        btn.onclick = () => {
            const type = btn.getAttribute('data-type');
            const cost = parseInt(btn.getAttribute('data-cost'));
            purchaseBooster(type, cost);
        };
    });

    // Slėpti naujo boosterio stulpelio jungiklį, nes jis nereikalingas marketplace
    const tbc = document.getElementById('toggleBoosterContainer');
    if (tbc) tbc.style.display = 'none';

    // Slėpti naujo boosterio stulpelį nepriklausomai nuo vartotojo nustatymo
    document.body.classList.add('hide-new-booster');
}

// Paslepia Marketplace ir grąžina į taškų sekimo lentelę
function hideMarketplace() {
    // Rodyti pagrindinę lentelę ir reset mygtuką
    document.getElementById('scoreboard').style.display = '';
    document.getElementById('resetButton').style.display = '';
    // Parodyti nuorodas į Loot box ir Marketplace
    const lootLink = document.getElementById('lootLink');
    if (lootLink) lootLink.style.display = '';
    const marketLink = document.getElementById('marketLink');
    if (marketLink) marketLink.style.display = '';
    // Slėpti Marketplace skiltį
    const mDiv = document.getElementById('marketplaceSection');
    if (mDiv) mDiv.style.display = 'none';
    // Išvalyti rezultatą
    const res = document.getElementById('marketResult');
    if (res) res.textContent = '';

    // Parodyti jungiklį atgal, kai grįžtame į lentelę
    const tbc = document.getElementById('toggleBoosterContainer');
    if (tbc) tbc.style.display = 'inline-flex';
    // Atkurti naujo boosterio stulpelio matomumą pagal vartotojo checkbox'ą
    toggleBoosterColumnVisibility();
}

// Pirkimo funkcija iš Marketplace: tikrina taškus, atima kainą ir suteikia boosterį
function purchaseBooster(type, cost) {
    const select = document.getElementById('marketPlayerSelect');
    const resultEl = document.getElementById('marketResult');
    if (!select || !resultEl) return;
    const playerId = parseInt(select.value);
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    if (player.points < cost) {
        alert('Pasirinktas žaidėjas neturi pakankamai taškų.');
        return;
    }
    // Sumažiname taškų skaičių
    player.points -= cost;
    // Suteikiame boosterį naudodami esamą setBooster funkciją
    setBooster(playerId, type);
    savePlayers();
    renderTable();
    // Žinutė apie pirkimą
    const label = boosterOptions.find(item => item.value === type)?.label || type;
    resultEl.textContent = 'Nupirkta: ' + label;
}

// === Lyderių lentelės funkcijos ===

// Suskaičiuoja lyderius per n dienų. Grąžina masyvą {id, total} nusileidimo tvarka
function computeLeaderboard(days) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const scores = [];
    players.forEach(p => {
        let sum = 0;
        if (Array.isArray(p.pointsHistory)) {
            p.pointsHistory.forEach(entry => {
                const d = new Date(entry.date);
                if (d.getTime() >= cutoff) {
                    sum += entry.change;
                }
            });
        }
        scores.push({ id: p.id, total: sum });
    });
    scores.sort((a, b) => b.total - a.total);
    return scores;
}

function showLeaderboard() {
    // Slėpti lentelę ir kitus skyrius
    document.getElementById('scoreboard').style.display = 'none';
    document.getElementById('resetButton').style.display = 'none';
    const lootLink = document.getElementById('lootLink');
    if (lootLink) lootLink.style.display = 'none';
    const marketLink = document.getElementById('marketLink');
    if (marketLink) marketLink.style.display = 'none';
    const leaderLink = document.getElementById('leaderLink');
    if (leaderLink) leaderLink.style.display = 'none';
    const chartLink = document.getElementById('chartLink');
    if (chartLink) chartLink.style.display = 'none';
    // Slėpti jungiklį
    const tbc = document.getElementById('toggleBoosterContainer');
    if (tbc) tbc.style.display = 'none';
    // Parodyti leaderboard
    document.getElementById('leaderboardSection').style.display = 'block';
    // Užpildyti savaitės ir mėnesio lenteles
    const week = computeLeaderboard(7);
    const month = computeLeaderboard(30);
    const weekBody = document.getElementById('leaderboardWeek');
    const monthBody = document.getElementById('leaderboardMonth');
    if (weekBody) {
        weekBody.innerHTML = '';
        week.slice(0, 5).forEach((item, idx) => {
            const tr = document.createElement('tr');
            const name = players.find(p => p.id === item.id)?.name || '';
            tr.innerHTML = `<td>${idx+1}</td><td>${name}</td><td>${item.total}</td>`;
            weekBody.appendChild(tr);
        });
    }
    if (monthBody) {
        monthBody.innerHTML = '';
        month.slice(0, 5).forEach((item, idx) => {
            const tr = document.createElement('tr');
            const name = players.find(p => p.id === item.id)?.name || '';
            tr.innerHTML = `<td>${idx+1}</td><td>${name}</td><td>${item.total}</td>`;
            monthBody.appendChild(tr);
        });
    }
}

function hideLeaderboard() {
    document.getElementById('leaderboardSection').style.display = 'none';
    // Rodyti lentelę ir reset
    document.getElementById('scoreboard').style.display = '';
    document.getElementById('resetButton').style.display = '';
    // Rodyti nuorodas
    const lootLink = document.getElementById('lootLink'); if (lootLink) lootLink.style.display = '';
    const marketLink = document.getElementById('marketLink'); if (marketLink) marketLink.style.display = '';
    const leaderLink = document.getElementById('leaderLink'); if (leaderLink) leaderLink.style.display = '';
    const chartLink = document.getElementById('chartLink'); if (chartLink) chartLink.style.display = '';
    // Rodyti jungiklį
    const tbc = document.getElementById('toggleBoosterContainer'); if (tbc) tbc.style.display = 'inline-flex';
    // Nustatyti naujo boosterio stulpelio matomumą
    toggleBoosterColumnVisibility();
}

// === Grafikai funkcijos ===

// Parodo grafikus
function showCharts() {
    // slėpti kitus skyrius
    document.getElementById('scoreboard').style.display = 'none';
    document.getElementById('resetButton').style.display = 'none';
    const lootLink = document.getElementById('lootLink'); if (lootLink) lootLink.style.display = 'none';
    const marketLink = document.getElementById('marketLink'); if (marketLink) marketLink.style.display = 'none';
    const leaderLink = document.getElementById('leaderLink'); if (leaderLink) leaderLink.style.display = 'none';
    const chartLink = document.getElementById('chartLink'); if (chartLink) chartLink.style.display = 'none';
    const tbc = document.getElementById('toggleBoosterContainer'); if (tbc) tbc.style.display = 'none';
    // parodyti
    document.getElementById('chartsSection').style.display = 'block';
    // užpildyti žaidėjų sąrašą diagramos pasirinkimui
    populateChartPlayerSelect();
    // nupiešti pradinį grafika (visi žaidėjai)
    renderChart();
}

function hideCharts() {
    document.getElementById('chartsSection').style.display = 'none';
    document.getElementById('scoreboard').style.display = '';
    document.getElementById('resetButton').style.display = '';
    const lootLink = document.getElementById('lootLink'); if (lootLink) lootLink.style.display = '';
    const marketLink = document.getElementById('marketLink'); if (marketLink) marketLink.style.display = '';
    const leaderLink = document.getElementById('leaderLink'); if (leaderLink) leaderLink.style.display = '';
    const chartLink = document.getElementById('chartLink'); if (chartLink) chartLink.style.display = '';
    const tbc = document.getElementById('toggleBoosterContainer'); if (tbc) tbc.style.display = 'inline-flex';
    toggleBoosterColumnVisibility();
}

// užpildo pasirinkimo sąrašą diagramoms
function populateChartPlayerSelect() {
    const select = document.getElementById('chartPlayerSelect');
    if (!select) return;
    select.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'Visi';
    select.appendChild(allOption);
    // sort players by name
    const sorted = [...players].sort((a,b) => a.name.localeCompare(b.name));
    sorted.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        select.appendChild(opt);
    });
}

// Piešia diagramą
function renderChart() {
    const canvas = document.getElementById('pointsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // Išvalome
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Pasirenkame spalvas žaidėjams
    const colors = ['#e74c3c','#3498db','#2ecc71','#9b59b6','#f1c40f','#e67e22','#1abc9c'];
    const selected = document.getElementById('chartPlayerSelect').value;
    let datasets = [];
    if (selected === 'all') {
        players.forEach((p,i) => {
            const data = buildSeries(p);
            datasets.push({ name: p.name, data: data, color: colors[i % colors.length] });
        });
    } else {
        const p = players.find(pl => pl.id === parseInt(selected));
        if (p) {
            datasets.push({ name: p.name, data: buildSeries(p), color: colors[0] });
        }
    }
    // Rasti bendrą laikotarpį
    let allDates = [];
    datasets.forEach(ds => {
        ds.data.forEach(pt => allDates.push(pt.date));
    });
    // unikalių ir rikiuota
    allDates = Array.from(new Set(allDates)).sort((a,b) => new Date(a) - new Date(b));
    if (allDates.length === 0) return;
    // jei tik viena data – duplicuojame, kad išvengtume dalybos iš nulio
    if (allDates.length === 1) {
        allDates = [allDates[0], allDates[0]];
    }
    // Sukuriame x ašies koordinacijas
    const margin = 40;
    const width = canvas.width - margin*2;
    const height = canvas.height - margin*2;
    // nustatome min/max
    let maxVal = 0;
    datasets.forEach(ds => {
        ds.data.forEach(pt => {
            if (pt.points > maxVal) maxVal = pt.points;
        });
    });
    if (maxVal < 10) maxVal = 10;
    // piešiame ašis
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    // x ašis
    ctx.beginPath();
    ctx.moveTo(margin, canvas.height - margin);
    ctx.lineTo(canvas.width - margin, canvas.height - margin);
    ctx.stroke();
    // y ašis
    ctx.beginPath();
    ctx.moveTo(margin, canvas.height - margin);
    ctx.lineTo(margin, margin);
    ctx.stroke();
    // x ašies žymės ir tekstas
    const maxTicks = 6;
    const step = Math.max(1, Math.floor(allDates.length / maxTicks));
    ctx.font = '11px Trebuchet MS';
    ctx.fillStyle = '#333';
    for (let i=0; i<allDates.length; i+=step) {
        const dateStr = allDates[i].substring(5,10); // MM-DD
        const x = margin + (i / (allDates.length-1)) * width;
        ctx.fillText(dateStr, x-15, canvas.height - margin + 15);
        ctx.beginPath();
        ctx.moveTo(x, canvas.height - margin);
        ctx.lineTo(x, canvas.height - margin - 4);
        ctx.stroke();
    }
    // y ašies žymės
    const yTicks = 5;
    for (let i=0; i<=yTicks; i++) {
        const val = Math.round((maxVal / yTicks) * i);
        const y = canvas.height - margin - (i / yTicks) * height;
        ctx.fillText(val.toString(), margin - 30, y + 3);
        ctx.beginPath();
        ctx.moveTo(margin-3, y);
        ctx.lineTo(margin, y);
        ctx.stroke();
    }
    // piešiame linijas kiekvienam žaidėjui
    datasets.forEach(ds => {
        ctx.strokeStyle = ds.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ds.data.forEach((pt, idx) => {
            const xIndex = allDates.indexOf(pt.date);
            const x = margin + (xIndex / (allDates.length-1)) * width;
            const y = canvas.height - margin - (pt.points / maxVal) * height;
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        // žaidėjo vardą
        const lastPt = ds.data[ds.data.length-1];
        const xLast = margin + (allDates.indexOf(lastPt.date) / (allDates.length-1)) * width;
        const yLast = canvas.height - margin - (lastPt.points / maxVal) * height;
        ctx.fillStyle = ds.color;
        ctx.fillText(ds.name, xLast + 5, yLast);
    });
}

// Sukuria taškų seriją iš žaidėjo istorijos
function buildSeries(player) {
    const data = [];
    if (!Array.isArray(player.pointsHistory) || player.pointsHistory.length === 0) {
        // jei nėra istorijos, naudok dabartinį laiką ir taškus
        data.push({ date: new Date().toISOString().substring(0,10), points: player.points });
        return data;
    }
    // sort history by date
    const sorted = [...player.pointsHistory].sort((a,b) => new Date(a.date) - new Date(b.date));
    sorted.forEach(entry => {
        // use date only (YYYY-MM-DD)
        const date = entry.date.substring(0,10);
        // cumulative points value at that entry
        data.push({ date: date, points: entry.points });
    });
    // compress duplicates: keep last point for each date
    const map = {};
    data.forEach(item => { map[item.date] = item.points; });
    const result = [];
    Object.keys(map).sort().forEach(d => { result.push({ date: d, points: map[d] }); });
    return result;
}
// Įjungia arba išjungia naujo boosterio stulpelio rodymą
function toggleBoosterColumnVisibility() {
    const checkbox = document.getElementById('toggleBoosterColumn');
    if (!checkbox) return;
    if (checkbox.checked) {
        document.body.classList.remove('hide-new-booster');
    } else {
        document.body.classList.add('hide-new-booster');
    }
}

// Pagal numatymą – naujo boosterio stulpelis paslėptas
document.addEventListener('DOMContentLoaded', () => {
    const cb = document.getElementById('toggleBoosterColumn');
    if (cb) {
        cb.checked = false;
        document.body.classList.add('hide-new-booster');
    }
    // FULL RESET MYGTUKAS TURI BŪTI ČIA
    const fullReset = document.getElementById('fullResetButton');
    if (fullReset) {
        fullReset.addEventListener('click', () => {
            if (confirm('Ar tikrai norite VISKĄ ištrinti? Visi duomenys bus prarasti!')) {
                localStorage.clear();
                location.reload();
            }
        });
    }
});


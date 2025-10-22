// --- элементы DOM ---
const heroGrid = document.getElementById('heroGrid');
const modal = document.getElementById('heroModal');
const closeModal = document.getElementById('closeModal');
const heroNameEl = document.getElementById('heroName');
const heroRolesEl = document.getElementById('heroRoles');
const heroAbilitiesEl = document.getElementById('heroAbilities');
const heroItemsEl = document.getElementById('heroItems');
const searchInput = document.getElementById('searchInput');

// --- глобальные объекты JSON ---
let heroAbilitiesMap = {};
let abilitiesInfo = {};
let itemsInfo = {};

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function createAbilityElement(key, info) {
    const displayName = info.dname || formatAbilityName(key);
    const imgUrl = `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/abilities/${key}_md.png`;
    
    return `
        <div style="display:flex;align-items:center;margin-bottom:8px;">
            <img src="${imgUrl}" 
                 alt="${displayName}" 
                 style="width:48px;height:48px;margin-right:10px;border-radius:6px;background:#2c2c2c;"
                 onerror="this.style.display='none'">
            <div>
                <strong>${displayName}</strong><br>
                <small>${info.desc || ''}</small>
            </div>
        </div>
    `;
}

function createItemElement(itemKey, itemInfo) {
    return `
        <img src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items/${itemKey}_lg.png" 
             alt="${itemInfo.dname || itemKey}" 
             style="width:48px;height:48px;border-radius:6px;border:1px solid #ffcc00;"
             onerror="this.style.display='none'">
        <div style="font-size:12px;margin-top:4px;">${itemInfo.dname || itemKey}</div>
    `;
}

function formatAbilityName(key) {
    return key.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getHeroAbilities(hero) {
    const heroKeyFull = hero.name;
    const heroKeyShort = hero.name.replace('npc_dota_hero_', '');
    const abilityData = heroAbilitiesMap[heroKeyFull] || heroAbilitiesMap[heroKeyShort];
    return abilityData?.abilities || [];
}

function filterDisplayAbilities(abilityKeys) {
    return abilityKeys.filter(k => k && !k.includes('special_bonus') && k !== 'generic_hidden');
}

function renderAbilities(abilities) {
    heroAbilitiesEl.innerHTML = '';
    
    if (abilities.length > 0) {
        abilities.forEach(key => {
            const info = abilitiesInfo[key] || {};
            const abDiv = document.createElement('div');
            abDiv.className = 'ability';
            abDiv.innerHTML = createAbilityElement(key, info);
            heroAbilitiesEl.appendChild(abDiv);
        });
    } else {
        heroAbilitiesEl.innerHTML = `<p>No abilities data available</p>`;
    }
}

function renderItems(hero) {
    const heroItems = heroItemsMap[hero.name] || [];
    heroItemsEl.innerHTML = '';
    
    if (heroItems.length > 0) {
        heroItems.forEach(itemKey => {
            const itemInfo = itemsInfo[itemKey] || {};
            const itDiv = document.createElement('div');
            itDiv.className = 'item';
            itDiv.style.display = 'inline-block';
            itDiv.style.margin = '5px';
            itDiv.style.textAlign = 'center';
            itDiv.innerHTML = createItemElement(itemKey, itemInfo);
            heroItemsEl.appendChild(itDiv);
        });
    } else {
        heroItemsEl.innerHTML = `<p>No popular items data available</p>`;
    }
}

// --- ОСНОВНАЯ ЛОГИКА ---

// --- подгрузка abilities + hero->abilities + items ---
Promise.all([
    fetch('https://raw.githubusercontent.com/odota/dotaconstants/master/build/hero_abilities.json').then(r => r.ok ? r.json() : {}),
    fetch('https://raw.githubusercontent.com/odota/dotaconstants/master/build/abilities.json').then(r => r.ok ? r.json() : {}),
    fetch('https://raw.githubusercontent.com/odota/dotaconstants/master/build/items.json').then(r => r.ok ? r.json() : {})
])
.then(([hMap, aInfo, iInfo]) => {
    heroAbilitiesMap = hMap || {};
    abilitiesInfo = aInfo || {};
    itemsInfo = iInfo || {};
    
    console.log('✅ Loaded heroAbilitiesMap count:', Object.keys(heroAbilitiesMap).length);
    console.log('✅ Loaded abilitiesInfo count:', Object.keys(abilitiesInfo).length);
    console.log('✅ Loaded itemsInfo count:', Object.keys(itemsInfo).length);
})
.catch(err => {
    console.warn('⚠️ Error loading reference JSONs:', err);
});

// --- получить и отрисовать героев и включить поиск ---
fetch('https://api.opendota.com/api/heroStats')
    .then(res => {
        if (!res.ok) throw new Error('Failed to load heroes');
        return res.json();
    })
    .then(heroes => {
        const allHeroes = heroes.slice();
        renderHeroes(allHeroes);
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim().toLowerCase();
                const filtered = allHeroes.filter(h => h.localized_name.toLowerCase().includes(query));
                renderHeroes(filtered);
            });
        }
    })
    .catch(err => {
        console.error('Error loading heroes:', err);
        heroGrid.innerHTML = 'Error loading heroes: ' + err.message;
    });

// --- render карточек ---
function renderHeroes(list) {
    heroGrid.innerHTML = '';
    list.forEach(hero => {
        const card = document.createElement('div');
        card.className = 'hero-card';
        const shortName = hero.name.replace('npc_dota_hero_', '');
        card.innerHTML = `
            <img src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/${shortName}_full.png" alt="${hero.localized_name}">
            <p>${hero.localized_name}</p>
        `;
        card.addEventListener('click', () => showHero(hero));
        heroGrid.appendChild(card);
    });
}

// --- показать модалку с данными героя ---
function showHero(hero) {
    heroNameEl.textContent = hero.localized_name;
    heroRolesEl.textContent = 'Roles: ' + (hero.roles?.length ? hero.roles.join(', ') : 'N/A');
    
    heroAbilitiesEl.innerHTML = 'Loading abilities...';
    heroItemsEl.innerHTML = 'Loading popular items...';
    modal.style.display = 'flex';
    
    const tryShow = () => {
        if (!heroAbilitiesMap || !abilitiesInfo || !itemsInfo) {
            setTimeout(tryShow, 200);
            return;
        }
        
        const abilityKeys = getHeroAbilities(hero);
        const displayAbilities = filterDisplayAbilities(abilityKeys);
        
        renderAbilities(displayAbilities);
        renderItems(hero);
    };
    
    tryShow();
}

// --- закрытие модалки ---
closeModal.onclick = () => { modal.style.display = 'none'; };
window.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
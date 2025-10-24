// --- элементы DOM --- dom elements ---
const heroGrid = document.getElementById('heroGrid');
const modal = document.getElementById('heroModal');
const closeModal = document.getElementById('closeModal');
const heroNameEl = document.getElementById('heroName');
const heroRolesEl = document.getElementById('heroRoles');
const heroAbilitiesEl = document.getElementById('heroAbilities');
const heroItemsEl = document.getElementById('heroItems');
const searchInput = document.getElementById('searchInput');

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ --- extra functions ---
function createAbilityElement(key, info) {
    const displayName = info.dname || formatAbilityName(key);
    const imgUrl = `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/abilities/${key}_md.png`;
    
    return `
        <div style="display:flex;align-items:center;margin-bottom:8px;">
            <img src="${imgUrl}" 
                 alt="${displayName}" 
                 style="width:48px; height:48px; margin-right:10px; border-radius:6px; background:#2c2c2c;"
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
             style="width:48px; height:48px; border-radius:6px; border:1px solid #ffcc00;"
             onerror="this.style.display='none'">
        <div style="font-size:12px; margin-top:4px;">${itemInfo.dname || itemKey}</div>
    `;
}

function formatAbilityName(key) {
    return key.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
}

// --- ЗАГРУЗКА ГЕРОЕВ ПРИ СТАРТЕ --- load heroes on start ---
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

// --- render карточек --- render hero cards ---
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

// --- показать модалку с данными героя --- show hero modal ---
async function showHero(hero) {
    heroNameEl.textContent = hero.localized_name;
    heroRolesEl.textContent = 'Roles: ' + (hero.roles?.length ? hero.roles.join(', ') : 'N/A');
    
    heroAbilitiesEl.innerHTML = 'Loading abilities...';
    heroItemsEl.innerHTML = 'Loading popular items...';
    modal.style.display = 'flex';
    
    try {
        // ЗАГРУЖАЕМ ДАННЫЕ ТОЛЬКО ПРИ КЛИКЕ НА ГЕРОЯ --- LOAD DATA ONLY ON HERO CLICK ---
        const [abilitiesResponse, itemsResponse, heroAbilitiesResponse] = await Promise.all([
            fetch('https://raw.githubusercontent.com/odota/dotaconstants/master/build/abilities.json'),
            fetch('https://raw.githubusercontent.com/odota/dotaconstants/master/build/items.json'),
            fetch('https://raw.githubusercontent.com/odota/dotaconstants/master/build/hero_abilities.json')
        ]);
        
        const abilitiesInfo = await abilitiesResponse.json();
        const itemsInfo = await itemsResponse.json();
        const heroAbilitiesMap = await heroAbilitiesResponse.json();
        
        // Получаем способности для этого героя --- Get abilities for this hero ---
        const heroKeyFull = hero.name;
        const heroKeyShort = hero.name.replace('npc_dota_hero_', '');
        const abilityData = heroAbilitiesMap[heroKeyFull] || heroAbilitiesMap[heroKeyShort];
        const abilityKeys = abilityData?.abilities || [];
        const displayAbilities = abilityKeys.filter(k => k && !k.includes('special_bonus') && k !== 'generic_hidden');
        
        // Отображаем способности show --- abilities
        renderAbilities(displayAbilities, abilitiesInfo);
        
        // Отображаем предметы из файла items.js --- show items from items.js file
        renderItems(hero, itemsInfo);
        
    } catch (error) {
        console.error('Error loading hero details:', error);
        heroAbilitiesEl.innerHTML = '<p>Error loading data</p>';
        heroItemsEl.innerHTML = '<p>Error loading data</p>';
    }
}

function renderAbilities(abilities, abilitiesInfo) {
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
        heroAbilitiesEl.innerHTML = '<p>No abilities data available</p>';
    }
}

function renderItems(hero, itemsInfo) {
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
        heroItemsEl.innerHTML = '<p>No popular items data available</p>';
    }
}

// --- закрытие модалки --- close modal ---
closeModal.onclick = () => { modal.style.display = 'none'; };

window.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

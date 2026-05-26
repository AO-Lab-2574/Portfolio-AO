const PUBLIC_SPREADSHEET_ID = '2PACX-1vRDcPUiYlP6i53PaxBMuyhBHe1S8YqyomPoweO7Rn7jKM_gAQup9rep__gpBAZ3EE7ELLltfB9OHzvV';
const SHEET_ID = '1150458993';       // portfolio用シートのgid
const DISPLAY_START = null;
const DISPLAY_END = null;

const API_URL = `https://docs.google.com/spreadsheets/d/e/${PUBLIC_SPREADSHEET_ID}/pub?output=csv&gid=${SHEET_ID}`;

// ========== CSVパース ==========
function parseCSVRows(csv) {
    const rows = [];
    let currentRow = [], currentCell = '', inQuotes = false;
    for (let i = 0; i < csv.length; i++) {
        const char = csv[i], nextChar = csv[i + 1];
        if (char === '"') {
            if (inQuotes && nextChar === '"') { currentCell += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell.trim()); currentCell = '';
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
            currentRow.push(currentCell.trim());
            if (currentRow.some(c => c !== '')) rows.push(currentRow);
            currentRow = []; currentCell = '';
            if (char === '\r') i++;
        } else {
            currentCell += char;
        }
    }
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c !== '')) rows.push(currentRow);
    }
    return rows;
}

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text ? String(text).replace(/[&<>"']/g, m => map[m]) : '';
}

// ========== プロフィール・スキルをM・N列から取得して反映 ==========
function applyProfileData(rows) {
    // M列=index 11, N列=index 12（A〜K列が0〜10のため）
    const map = {};
    rows.forEach(row => {
        const key = (row[11] || '').trim();
        const val = (row[12] || '').trim();
        if (key && key !== 'profile_key') map[key] = val;
    });

    // 強み
    if (map['強み']) {
        const ul = document.getElementById('strengths-list');
        if (ul) {
            const items = map['強み'].split('\n').map(s => s.replace(/^・/, '').trim()).filter(Boolean);
            ul.innerHTML = items.map(i => `<li>${escapeHtml(i)}</li>`).join('');
        }
    }

    // 保有資格
    if (map['保有資格']) {
        const ul = document.getElementById('qualifications-list');
        if (ul) {
            const items = map['保有資格'].split(',').map(s => s.trim()).filter(Boolean);
            ul.innerHTML = items.map(i => `<li>${escapeHtml(i)}</li>`).join('');
        }
    }

    // スキル各カテゴリ
    const skillMap = [
        { key: 'スキル_言語',    id: 'skills-lang' },
        { key: 'スキル_ツール',  id: 'skills-tools' },
        { key: 'スキル_DB',      id: 'skills-db' },
        { key: 'スキル_クラウド',id: 'skills-cloud' },
    ];
    skillMap.forEach(({ key, id }) => {
        if (map[key]) {
            const container = document.getElementById(id);
            if (container) {
                const items = map[key].split(',').map(s => s.trim()).filter(Boolean);
                container.innerHTML = items.map(i => `<div class="skill-tag">${escapeHtml(i)}</div>`).join('');
            }
        }
    });
}

// ========== プロジェクト表示 ==========
function parseCSV(csv) {
    const rows = parseCSVRows(csv);
    if (rows.length === 0) return [];
    let headerIndex = -1, headers = [];
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const r = rows[i];
        if (r.some(h => h && (h.includes('項番') || h === 'No')) || r.some(h => h && h.includes('案件名'))) {
            headerIndex = i; headers = r; break;
        }
    }
    if (headerIndex === -1) return [];
    const projects = [];
    let count = 0;
    for (let i = headerIndex + 1; i < rows.length; i++) {
        const values = rows[i];
        if (values.every(v => !v || !v.trim())) continue;
        const project = {};
        headers.forEach((h, idx) => { if (h) project[h] = values[idx] || ''; });
        const kouban = project['項番'] || project['No'] || '';
        const ankenMei = project['案件名'] || project['案件名称'] || '';
        if ((kouban && kouban.trim()) || (ankenMei && ankenMei.trim())) {
            project['_データ番号'] = ++count;
            projects.push(project);
        }
    }
    return projects;
}

function filterByKouban(projects) {
    if (DISPLAY_START === null && DISPLAY_END === null) return projects;
    return projects.filter((p, i) => {
        const n = parseInt(p['項番'] || p['No'] || '') || p['_データ番号'] || (i + 1);
        return (DISPLAY_START === null || n >= DISPLAY_START) && (DISPLAY_END === null || n <= DISPLAY_END);
    });
}

function displayProjects(projects) {
    const container = document.getElementById('projects-container');
    container.innerHTML = '';
    if (projects.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;padding:40px;">表示するプロジェクトデータがありません。</p>';
        return;
    }
    projects.forEach((project, index) => {
        const div = document.createElement('div');
        div.className = 'project';
        const kouban    = project['項番'] || project['No'] || (index + 1);
        const ankenMei  = project['案件名'] || project['案件名称'] || '案件名なし';
        const period    = project['案件期間'] || project['期間'] || '期間未定';
        const memberCount = project['人数'] || '-';
        const gyoushu   = project['業種'] || project['業種・業態'] || '-';
        const yakuwari  = project['役割'] || '-';
        const gijutsu   = project['使用技術'] || '';
        const techArray = gijutsu.split(/[\n,、]/).map(t => t.trim()).filter(t => t && t !== '-');
        const workItems = (project['作業内容'] || '').split('\n').map(s => s.trim()).filter(s => s && s !== '-');
        const phaseItems = (project['担当作業/フェーズ'] || '').split('\n').map(s => s.trim()).filter(s => s && s !== '-');

        div.innerHTML = `
            <h3>${escapeHtml(ankenMei)}</h3>
            <div class="project-meta">
                <span>📋 項番: ${escapeHtml(kouban)}</span>
                <span>📅 参画期間: ${escapeHtml(period)}</span>
                ${memberCount !== '-' ? `<span>👥 人数: ${escapeHtml(memberCount)}</span>` : ''}
                <span>🏢 業種・業態: ${escapeHtml(gyoushu)}</span>
                ${yakuwari !== '-' ? `<span>💼 役割: ${escapeHtml(yakuwari)}</span>` : ''}
            </div>
            ${techArray.length > 0 ? `<h4 style="color:#667eea;margin-top:20px;margin-bottom:10px;">使用技術</h4><div class="tech-stack">${techArray.map(t => `<span class="tech-badge">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
            ${workItems.length > 0 ? `<h4 style="color:#667eea;margin-top:20px;margin-bottom:10px;">作業内容</h4><ul>${workItems.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>` : ''}
            ${phaseItems.length > 0 ? `<h4 style="color:#667eea;margin-top:20px;margin-bottom:10px;">担当作業 / フェーズ</h4><ul>${phaseItems.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>` : ''}
        `;
        container.appendChild(div);
    });
}

// ========== メイン ==========
async function loadAll() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP エラー: ${response.status}`);
        const csvText = await response.text();
        const rows = parseCSVRows(csvText);

        // M・N列からプロフィール・スキルを反映
        applyProfileData(rows);

        // プロジェクト一覧を表示
        const projects = parseCSV(csvText);
        displayProjects(filterByKouban(projects));
        document.getElementById('loading').style.display = 'none';
    } catch (error) {
        console.error('データ読み込みエラー:', error);
        document.getElementById('loading').innerHTML = `<p style="color:red;">データの読み込みに失敗しました。<br>エラー: ${error.message}</p>`;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadAll();
    const card = document.getElementById('cardFlipContainer');
    if (card) card.addEventListener('click', () => card.classList.toggle('flipped'));
});

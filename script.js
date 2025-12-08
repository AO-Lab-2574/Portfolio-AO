// スプレッドシートのIDとシート名を設定
const SPREADSHEET_ID = '1iwP323oeDeCseDJpslj07ulrQT77lSF6';
const SHEET_ID = '228151703';

// Google Sheets APIのエンドポイント（公開スプレッドシート用）
// const API_URL = `https://docs.google.com/spreadsheets/d/${1iwP323oeDeCseDJpslj07ulrQT77lSF6}/export?format=csv&gid=${228151703}`;
const API_URL = `https://docs.google.com/spreadsheets/d/1iwP323oeDeCseDJpslj07ulrQT77lSF6/edit?usp=sharing&ouid=107438013508865255994&rtpof=true&sd=true`;

/**
 * プロジェクトデータを読み込む
 */
async function loadProjects() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error('スプレッドシートの読み込みに失敗しました');
        }

        const csvText = await response.text();

        // CSVをパース
        const projects = parseCSV(csvText);

        // プロジェクトを表示
        displayProjects(projects);

        // ローディング表示を非表示
        document.getElementById('loading').style.display = 'none';
    } catch (error) {
        console.error('データの読み込みエラー:', error);
        document.getElementById('loading').innerHTML = `
            <p style="color: red;">データの読み込みに失敗しました。</p>
            <p style="color: #666; font-size: 14px; margin-top: 10px;">
                スプレッドシートが「ウェブに公開」されているか確認してください。<br>
                エラー詳細: ${error.message}
            </p>
        `;
    }
}

/**
 * CSVテキストをパースしてオブジェクト配列に変換
 */
function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const projects = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = parseCSVLine(lines[i]);
        const project = {};

        headers.forEach((header, index) => {
            project[header] = values[index] ? values[index].replace(/^"|"$/g, '') : '';
        });

        // 項番が存在する行のみ追加
        if (project['項番']) {
            projects.push(project);
        }
    }

    return projects;
}

/**
 * CSV行をパース（カンマ区切りだが、ダブルクォート内のカンマは無視）
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            // ダブルクォートのエスケープ処理（""）
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++; // 次の文字をスキップ
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

/**
 * プロジェクトをHTML表示
 */
function displayProjects(projects) {
    const container = document.getElementById('projects-container');
    container.innerHTML = '';

    if (projects.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">プロジェクトデータがありません。</p>';
        return;
    }

    projects.forEach(project => {
        const projectDiv = document.createElement('div');
        projectDiv.className = 'project';

        // 使用技術を配列に変換（カンマまたは読点で区切る）
        const techStack = project['使用技術']
            ? project['使用技術'].split(/[、,，]/).map(t => t.trim()).filter(t => t)
            : [];

        // 作業内容を配列に変換（改行で区切る）
        const workItems = project['作業内容']
            ? project['作業内容'].split(/\n|\\n/).map(item => item.trim()).filter(item => item)
            : [];

        projectDiv.innerHTML = `
            <h3>${escapeHtml(project['案件名']) || '案件名なし'}</h3>
            <div class="project-meta">
                <span>📅 ${escapeHtml(project['期間']) || '期間未定'}</span>
                <span>👥 ${escapeHtml(project['人数']) || '-'}人</span>
                <span>🏢 ${escapeHtml(project['業種']) || '-'}</span>
                <span>💼 ${escapeHtml(project['役割']) || '-'}</span>
            </div>

            ${techStack.length > 0 ? `
                <h4 style="color: #667eea; margin-top: 20px; margin-bottom: 10px;">使用技術</h4>
                <div class="tech-stack">
                    ${techStack.map(tech => `<span class="tech-badge">${escapeHtml(tech)}</span>`).join('')}
                </div>
            ` : ''}

            ${workItems.length > 0 ? `
                <h4 style="color: #667eea; margin-top: 20px; margin-bottom: 10px;">作業内容</h4>
                <ul>
                    ${workItems.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                </ul>
            ` : ''}

            ${project['担当フェーズ'] ? `
                <h4 style="color: #667eea; margin-top: 20px; margin-bottom: 10px;">担当フェーズ</h4>
                <p>${escapeHtml(project['担当フェーズ'])}</p>
            ` : ''}
        `;

        container.appendChild(projectDiv);
    });
}

/**
 * HTMLエスケープ処理
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
}

// ページ読み込み時にデータを取得
window.addEventListener('DOMContentLoaded', loadProjects);

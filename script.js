// スプレッドシートの公開ID（「ウェブに公開」で取得したID）
const PUBLIC_SPREADSHEET_ID = '2PACX-1vSp9rwwRm7ecv2VH75gmK5A2WMEjt92Mg4bUQj94_4jJa1pIottYecfSZWhww6Gzw';
const SHEET_ID = '228151703';

// 表示する項番の範囲を指定（nullの場合は全て表示）
const DISPLAY_START = null; // 開始項番（例: 1）
const DISPLAY_END = null;   // 終了項番（例: 3）

// Google Sheets APIのエンドポイント（公開スプレッドシート用）
const API_URL = `https://docs.google.com/spreadsheets/d/e/${PUBLIC_SPREADSHEET_ID}/pub?output=csv&gid=${SHEET_ID}`;

/**
 * プロジェクトデータを読み込む
 */
async function loadProjects() {
    try {
        console.log('スプレッドシートを読み込み中...', API_URL);

        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`HTTP エラー: ${response.status}`);
        }

        const csvText = await response.text();
        console.log('CSV取得成功。データ長:', csvText.length);

        // CSVをパース
        const projects = parseCSV(csvText);
        console.log('パース完了。プロジェクト数:', projects.length);

        // 項番でフィルタリング
        const filteredProjects = filterByKouban(projects);
        console.log('フィルタリング後のプロジェクト数:', filteredProjects.length);

        // プロジェクトを表示
        displayProjects(filteredProjects);

        // ローディング表示を非表示
        document.getElementById('loading').style.display = 'none';
    } catch (error) {
        console.error('データの読み込みエラー:', error);
        document.getElementById('loading').innerHTML = `
            <p style="color: red;">データの読み込みに失敗しました。</p>
            <p style="color: #666; font-size: 14px; margin-top: 10px;">
                <strong>以下を確認してください：</strong><br>
                1. スプレッドシートが「ウェブに公開」されているか<br>
                2. スプレッドシートのIDとシートIDが正しいか<br>
                3. ブラウザのコンソール（F12）でエラー詳細を確認<br><br>
                エラー詳細: ${error.message}
            </p>
        `;
    }
}

/**
 * CSVテキストをパースしてオブジェクト配列に変換
 */
function parseCSV(csv) {
    const lines = csv.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
        console.error('CSVデータが空です');
        return [];
    }

    const headers = parseCSVLine(lines[0]);
    console.log('ヘッダー:', headers);

    const projects = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const project = {};

        headers.forEach((header, index) => {
            project[header] = values[index] || '';
        });

        // 項番が存在する行のみ追加
        if (project['項番'] && project['項番'].trim()) {
            projects.push(project);
            console.log(`項番 ${project['項番']} を追加:`, project['案件名']);
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
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
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
 * 項番で絞り込み
 */
function filterByKouban(projects) {
    if (DISPLAY_START === null && DISPLAY_END === null) {
        return projects; // 全て表示
    }

    return projects.filter(project => {
        const kouban = parseInt(project['項番']);

        if (isNaN(kouban)) return false;

        const matchStart = DISPLAY_START === null || kouban >= DISPLAY_START;
        const matchEnd = DISPLAY_END === null || kouban <= DISPLAY_END;

        return matchStart && matchEnd;
    });
}

/**
 * プロジェクトをHTML表示
 */
function displayProjects(projects) {
    const container = document.getElementById('projects-container');
    container.innerHTML = '';

    if (projects.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">表示するプロジェクトデータがありません。</p>';
        return;
    }

    projects.forEach(project => {
        const projectDiv = document.createElement('div');
        projectDiv.className = 'project';

        // 使用技術を配列に変換
        const techStack = project['使用技術'] || project['開発言語・ツール・データベース'] || '';
        const techArray = techStack
            ? techStack.split(/[、,，\n]/).map(t => t.trim()).filter(t => t)
            : [];

        // 作業内容を配列に変換
        const workContent = project['作業内容'] || '';
        const workItems = workContent
            ? workContent.split(/\n/).map(item => item.trim()).filter(item => item)
            : [];

        projectDiv.innerHTML = `
            <h3>${escapeHtml(project['案件名'] || project['プロジェクト名']) || '案件名なし'}</h3>
            <div class="project-meta">
                <span>📋 項番: ${escapeHtml(project['項番'])}</span>
                <span>📅 ${escapeHtml(project['期間'] || project['作業期間']) || '期間未定'}</span>
                <span>👥 ${escapeHtml(project['人数']) || '-'}人</span>
                <span>🏢 ${escapeHtml(project['業種'] || project['業種・業態']) || '-'}</span>
                <span>💼 ${escapeHtml(project['役割'] || project['担当分野']) || '-'}</span>
            </div>

            ${techArray.length > 0 ? `
                <h4 style="color: #667eea; margin-top: 20px; margin-bottom: 10px;">使用技術</h4>
                <div class="tech-stack">
                    ${techArray.map(tech => `<span class="tech-badge">${escapeHtml(tech)}</span>`).join('')}
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
    return text ? String(text).replace(/[&<>"']/g, m => map[m]) : '';
}

// ページ読み込み時にデータを取得
window.addEventListener('DOMContentLoaded', loadProjects);
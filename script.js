// スプレッドシートの元のID
const ORIGINAL_SPREADSHEET_ID = '1iwP323oeDeCseDJpslj07ulrQT77lSF6';

// スプレッドシートの公開ID（「ウェブに公開」で取得したID）
const PUBLIC_SPREADSHEET_ID = '2PACX-1vSp9rwwRm7ecv2VH75gmK5A2WMEjt92Mg4bUQj94_4jJa1pIottYecfSZWhww6Gzw';

// 新しいシンプルなシートのID
const SHEET_ID = '1280612595';

// 表示する項番の範囲を指定（nullの場合は全て表示）
const DISPLAY_START = null; // 開始項番（例: 1）
const DISPLAY_END = null;   // 終了項番（例: 2）

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
        console.log('CSVの最初の500文字:', csvText.substring(0, 500));

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
                2. 正しいシート（portfolio用）を読み込んでいるか<br>
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

    // ヘッダー行を探す（「項番」を含む行）
    let headerIndex = -1;
    let headers = [];

    for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const testHeaders = parseCSVLine(lines[i]);

        // デバッグ: 各行の最初の10列を表示
        console.log(`${i}行目:`, testHeaders.slice(0, 10).map(h => h ? h.substring(0, 20) : '(空)'));

        // 「項番」を含む行をヘッダーとみなす
        const hasKouban = testHeaders.some(h => h && (h.includes('項番') || h === 'No' || h === 'NO'));
        const hasAnkenMei = testHeaders.some(h => h && (h.includes('案件名') || h.includes('プロジェクト')));

        if (hasKouban || hasAnkenMei) {
            headerIndex = i;
            headers = testHeaders;
            console.log(`✓ ヘッダー行を発見: ${i}行目（Excel行: ${i + 1}）`, headers.filter(h => h));
            break;
        }
    }

    if (headerIndex === -1) {
        console.error('❌ ヘッダー行が見つかりませんでした');
        console.log('💡 先頭10行を確認してください');
        return [];
    }

    const projects = [];

    // ヘッダーの次の行からデータを読み込む
    let projectCount = 0;
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);

        // 空行をスキップ
        if (values.every(v => !v || !v.trim())) {
            continue;
        }

        const project = {};

        headers.forEach((header, index) => {
            if (header) { // ヘッダーが空でない場合のみ
                project[header] = values[index] || '';
            }
        });

        // プロジェクト名、案件名のいずれかがある行を追加
        const kouban = project['項番'] || project['No'] || project['NO'] || '';
        const ankenMei = project['案件名'] || project['案件名称'] || project['プロジェクト名'] || '';
        const period = project['案件期間'] || project['期間'] || project['作業期間'] || '';

        // 項番または案件名がある行のみ追加
        if ((kouban && kouban.trim()) || (ankenMei && ankenMei.trim())) {
            projectCount++;
            project['_行番号'] = i + 1; // Excel行番号
            project['_データ番号'] = projectCount;
            projects.push(project);
            console.log(`✓ プロジェクト${projectCount}を追加 (Excel ${i + 1}行目): 項番=${kouban}, 案件名=${ankenMei.substring(0, 30)}`);
        }
    }

    console.log(`📊 合計 ${projectCount} 件のプロジェクトデータを読み込みました`);
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

    return projects.filter((project, index) => {
        // 項番で絞り込み
        const koubanStr = project['項番'] || project['No'] || project['NO'] || '';
        const dataNumber = project['_データ番号'] || (index + 1);

        if (!koubanStr) {
            // 項番がない場合はデータ番号で判定
            const matchStart = DISPLAY_START === null || dataNumber >= DISPLAY_START;
            const matchEnd = DISPLAY_END === null || dataNumber <= DISPLAY_END;
            return matchStart && matchEnd;
        }

        const kouban = parseInt(koubanStr);

        if (isNaN(kouban)) return true;

        const matchStart = DISPLAY_START === null || kouban >= DISPLAY_START;
        const matchEnd = DISPLAY_END === null || kouban <= DISPLAY_END;

        const matched = matchStart && matchEnd;

        if (DISPLAY_START !== null || DISPLAY_END !== null) {
            console.log(`項番${kouban}: ${matched ? '✓表示' : '×非表示'}`);
        }

        return matched;
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

    projects.forEach((project, index) => {
        const projectDiv = document.createElement('div');
        projectDiv.className = 'project';

        // 各フィールドを取得
        const kouban = project['項番'] || project['No'] || project['NO'] || (index + 1);
        const ankenMei = project['案件名'] || project['案件名称'] || project['プロジェクト名'] || '案件名なし';
        const period = project['案件期間'] || project['期間'] || project['作業期間'] || '期間未定';
        const memberCount = project['人数'] || '-';
        const gyoushu = project['業種'] || project['業種・業態'] || '-';
        const yakuwari = project['役割'] || project['担当分野'] || '-';

        // 使用技術を取得
        const gijutsu = project['使用技術'] || project['開発言語・ツール・データベース/フレームワーク'] || project['技術'] || '';
        const techArray = gijutsu
            .split(/[\n,、，]/)
            .map(t => t.trim())
            .filter(t => t && t !== '-');

        // 作業内容を取得
        const sagyou = project['作業内容'] || project['担当作業/フェーズ'] || '';
        const workItems = sagyou
            .split(/\n/)
            .map(item => item.trim())
            .filter(item => item && item !== '-');

        projectDiv.innerHTML = `
            <h3>${escapeHtml(ankenMei)}</h3>
            <div class="project-meta">
                <span>📋 項番: ${escapeHtml(kouban)}</span>
                <span>📅 参画期間: ${escapeHtml(period)}</span>
                ${memberCount !== '-' ? `<span>👥 人数: ${escapeHtml(memberCount)}</span>` : ''}
                <span>🏢 業種・業態: ${escapeHtml(gyoushu)}</span>
                ${yakuwari !== '-' ? `<span>💼 役割: ${escapeHtml(yakuwari)}</span>` : ''}
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
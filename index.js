import { chromium } from 'playwright';

// --- 設定情報 ---
const TARGET_PROJECT_ID = '1439348321'; // 対象のプロジェクトID
const PROJECT_AUTHOR = 'SyllivaUser1';    // フォローする作者のユーザー名

// --- 複数アカウントの自動読み込み ---
function loadAccounts() {
    const accounts = [];
    
    for (let i = 1; i <= 20; i++) {
        const sessionId = process.env[`SCRATCH_SESSION_ID_${i}`];
        const csrfToken = process.env[`SCRATCH_CSRF_TOKEN_${i}`];

        if (sessionId) {
            accounts.push({
                name: `Account ${i}`,
                sessionId: sessionId.trim(),
                csrfToken: (csrfToken || '').trim()
            });
        }
    }
    return accounts;
}

async function main() {
    console.log("=== 複数アカウント自動アクション ＆ スタジオ巡回ボット開始 ===");

    const ACCOUNTS = loadAccounts();
    console.log(`検出されたアカウント数: ${ACCOUNTS.length}件`);

    if (ACCOUNTS.length === 0) {
        console.log("エラー: 有効なクッキー（GitHub Secrets）が設定されていません。");
        return;
    }

    const browser = await chromium.launch({ headless: true });

    // 各アカウントごとに順番に処理を実行
    for (const [index, account] of ACCOUNTS.entries()) {
        console.log(`\n--- [${index + 1}/${ACCOUNTS.length}] ${account.name} で処理を実行中... ---`);

        const context = await browser.newContext();

        await context.addCookies([
            {
                name: 'scratchsessionsid',
                value: account.sessionId,
                domain: '.scratch.mit.edu',
                path: '/',
                secure: true,
                httpOnly: true
            },
            {
                name: 'scratchcsrftoken',
                value: account.csrfToken,
                domain: '.scratch.mit.edu',
                path: '/',
                secure: true,
                httpOnly: false
            }
        ]);

        const page = await context.newPage();

        try {
            // 1. プロジェクトページで「いいね」「お気に入り」
            const projectUrl = `https://scratch.mit.edu/projects/${TARGET_PROJECT_ID}/`;
            await page.goto(projectUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(2500);

            // いいね
            const loveBtn = await page.$('.project-likes .icon-love, button.love-button, [data-control="love"]');
            if (loveBtn) {
                await loveBtn.click();
                console.log(` => [成功] 「いいね」を押しました！`);
                await page.waitForTimeout(800);
            }

            // お気に入り
            const favBtn = await page.$('.project-favorites .icon-favorite, button.favorite-button, [data-control="favorite"]');
            if (favBtn) {
                await favBtn.click();
                console.log(` => [成功] 「お気に入り」を押しました！`);
                await page.waitForTimeout(800);
            }

            // 2. 作者をフォロー
            const profileUrl = `https://scratch.mit.edu/users/${PROJECT_AUTHOR}/`;
            await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(2000);

            const followBtn = await page.$('button.follow-button, .follow-action');
            if (followBtn) {
                const btnText = await followBtn.innerText();
                if (btnText.includes('Follow') || btnText.includes('フォロー')) {
                    await followBtn.click();
                    console.log(` => [成功] ユーザー "${PROJECT_AUTHOR}" をフォローしました！`);
                } else {
                    console.log(` => [情報] すでにフォロー済みです。`);
                }
            }

        } catch (err) {
            console.log(` => [エラー] ${account.name} の処理失敗:`, err.message);
        }

        // 先にコンテキストを閉じる
        await context.close();
        
        // 次のアカウントに進む前のインターバル（ブラウザ自体はまだ起動中なので問題なし）
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    await browser.close();
    console.log("\n=== 全アカウントのアクション処理が完了しました ===");
}

main();

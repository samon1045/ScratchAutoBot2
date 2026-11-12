import { chromium } from 'playwright';

const TARGET_PROJECT_ID = '1439348321';
const PROJECT_AUTHOR = 'SyllivaUser1';  

const ACCOUNTS = [
    {
        name: 'Account 1',
        sessionId: process.env.SCRATCH_SESSION_ID_1 || '',
        csrfToken: process.env.SCRATCH_CSRF_TOKEN_1 || ''
    },
    {
        name: 'Account 2',
        sessionId: process.env.SCRATCH_SESSION_ID_2 || '',
        csrfToken: process.env.SCRATCH_CSRF_TOKEN_2 || ''
    }
].filter(acc => acc.sessionId !== '');

async function main() {
    console.log(`=== 複数アカウント自動アクションボット開始 (対象プロジェクト: ${TARGET_PROJECT_ID}) ===`);

    if (ACCOUNTS.length === 0) {
        console.log("エラー: 有効なアカウントのクッキー（SESSION_ID）が設定されていません。");
        return;
    }

    const browser = await chromium.launch({ headless: true });

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
            const projectUrl = `https://scratch.mit.edu/projects/${TARGET_PROJECT_ID}/`;
            await page.goto(projectUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(3000);
          
            const loveBtn = await page.$('.project-likes .icon-love, button.love-button, [data-control="love"]');
            if (loveBtn) {
                await loveBtn.click();
                console.log(` => [成功] 「いいね」を押しました！`);
                await page.waitForTimeout(1000);
            } else {
                console.log(` => [スキップ] 「いいね」ボタンが見つからないか、すでに押されています。`);
            }

            const favBtn = await page.$('.project-favorites .icon-favorite, button.favorite-button, [data-control="favorite"]');
            if (favBtn) {
                await favBtn.click();
                console.log(` => [成功] 「お気に入り」を押しました！`);
                await page.waitForTimeout(1000);
            } else {
                console.log(` => [スキップ] 「お気に入り」ボタンが見つからないか、すでに押されています。`);
            }

            const profileUrl = `https://scratch.mit.edu/users/${PROJECT_AUTHOR}/`;
            console.log(`作者のプロフィールに移動中: ${profileUrl}`);
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
            } else {
                console.log(` => [スキップ] フォローボタンが見つかりませんでした。`);
            }

        } catch (err) {
            console.log(` => [エラー] ${account.name} の処理中に失敗しました:`, err.message);
        }

        await context.close();

        console.log("アカウントを切り替えるため、少し待機します...");
        await page.waitForTimeout(5000);
    }

    await browser.close();
    console.log("\n=== 全アカウントの処理が完了しました ===");
}

main();

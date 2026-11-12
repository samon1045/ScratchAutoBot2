import { chromium } from 'playwright';

const TARGET_PROJECT_ID = '1439348321';
const PROJECT_AUTHOR = 'SyllivaUser1';

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
    console.log("=== 複数アカウント自動アクション ボット開始 ===");

    const ACCOUNTS = loadAccounts();
    console.log(`検出されたアカウント数: ${ACCOUNTS.length}件`);

    if (ACCOUNTS.length === 0) {
        console.log("エラー: 有効なクッキー（GitHub Secrets）が設定されていません。");
        return;
    }

    const browser = await chromium.launch({ headless: true });

    for (const [index, account] of ACCOUNTS.entries()) {
        console.log(`\n--- [${index + 1}/${ACCOUNTS.length}] ${account.name} の処理開始 ---`);

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
            // 1. プロジェクトページへ移動
            const projectUrl = `https://scratch.mit.edu/projects/${TARGET_PROJECT_ID}/`;
            console.log(`プロジェクトページへアクセス: ${projectUrl}`);
            await page.goto(projectUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(3000);

            // いいねボタン (Love it)
            const loveBtn = await page.$('.project-likes .icon-love, button.love-button, [data-control="love"]');
            if (loveBtn) {
                await loveBtn.click();
                console.log(` => [成功] 「いいね」をクリックしました！`);
            } else {
                console.log(` => [スキップ] 「いいね」ボタンが見つかりません。`);
            }
            await page.waitForTimeout(1000);

            // お気に入りボタン (Favorite)
            const favBtn = await page.$('.project-favorites .icon-favorite, button.favorite-button, [data-control="favorite"]');
            if (favBtn) {
                await favBtn.click();
                console.log(` => [成功] 「お気に入り」をクリックしました！`);
            } else {
                console.log(` => [スキップ] 「お気に入り」ボタンが見つかりません。`);
            }
            await page.waitForTimeout(1000);

            // 2. 作者のプロフィールページへ移動してフォロー
            const profileUrl = `https://scratch.mit.edu/users/${PROJECT_AUTHOR}/`;
            console.log(`プロフィールへアクセス: ${profileUrl}`);
            await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(2500);

            const followBtn = await page.$('button.follow-button, .follow-action button');
            if (followBtn) {
                const btnText = await followBtn.innerText();
                console.log(`フォローボタンのテキスト: "${btnText.trim()}"`);
                if (btnText.includes('Follow') || btnText.includes('フォロー')) {
                    await followBtn.click();
                    console.log(` => [成功] ユーザー "${PROJECT_AUTHOR}" をフォローしました！`);
                } else {
                    console.log(` => [情報] すでにフォロー済みです。`);
                }
            } else {
                console.log(` => [スキップ] フォローボタンが見つかりませんでした。`);
            }

            // 成功した場合でも必ずスクリーンショットを保存してアーティファクトに残す
            await page.screenshot({ path: `success-account-${index + 1}.png` });

        } catch (err) {
            console.error(` => [エラー発生] ${account.name} で例外エラー:`, err.message);
            // エラー時の画面キャプチャを保存
            await page.screenshot({ path: `error-account-${index + 1}.png` }).catch(() => {});
        }

        await context.close();
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    await browser.close();
    console.log("\n=== 全アカウントのアクション処理が完了しました ===");
}

main();

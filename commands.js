const fs = require('fs'); 
const { loginAdmin } = require('./auth');
const db = require('./database.json');

let adminSessions = {}; // pamti aktivne admine i vrijeme logina: { userId: timestamp }
let conversations = {}; // pamti stanje razgovora za svakog korisnika

// Timeout za sesiju admina u ms (30 minuta)
const ADMIN_SESSION_TIMEOUT = 30 * 60 * 1000;

function isAdminSessionActive(userId) {
    if (!adminSessions[userId]) return false;
    const now = Date.now();
    if (now - adminSessions[userId] > ADMIN_SESSION_TIMEOUT) {
        delete adminSessions[userId];
        return false;
    }
    return true;
}

module.exports = async function handleMessage(client, msg) {
    const text = msg.body.trim();
    const from = msg.from;

    // Provjera sesije admina sa timeoutom
    const adminLoggedIn = isAdminSessionActive(from);

    // Ako korisnik je u toku konverzacije sa botom, pratimo stanje:
    if (conversations[from]) {
        const state = conversations[from];

        // Login koraci
        if (state.type === 'login') {
            if (state.step === 1) {
                state.username = text;
                state.step = 2;
                await msg.reply('🔒 Unesi lozinku:');
                return;
            }
            if (state.step === 2) {
                const username = state.username;
                const password = text;
                if (loginAdmin(username, password)) {
                    adminSessions[from] = Date.now(); // postavi vrijeme logina
                    delete conversations[from];
                    await msg.reply('✅ Uspješno logovan kao admin. Sesija traje 30 minuta.');
                } else {
                    delete conversations[from];
                    await msg.reply('❌ Pogrešan username ili password. Pokušaj ponovo sa login.');
                }
                return;
            }
        }

        // Dodavanje paketa korak po korak - samo ako admin
        if (state.type === 'dodaj paket') {
            if (!adminLoggedIn) {
                delete conversations[from];
                return msg.reply('❌ Nisi logovan kao admin ili ti je sesija istekla. Koristi komandu login.');
            }
            // ... (ovdje nastaviš sa koracima za dodavanje paketa)
            adminSessions[from] = Date.now(); // osvježi sesiju
            return;
        }

        // Izmjena paketa korak po korak - samo ako admin
        if (state.type === 'izmijeni paket') {
            if (!adminLoggedIn) {
                delete conversations[from];
                return msg.reply('❌ Nisi logovan kao admin ili ti je sesija istekla. Koristi komandu login.');
            }
            adminSessions[from] = Date.now(); // osvježi sesiju
            // ... (nastaviš sa koracima za izmjenu paketa)
            return;
        }

        // Obrada komande status - unos broja paketa
        if (state.type === 'status' && state.step === 1) {
            const broj = parseInt(text);
            if (isNaN(broj) || broj < 1 || broj > db.paketi.length) {
                delete conversations[from];
                await msg.reply('⚠️ Pogrešan unos. Počni ponovo sa komandom *status* i pošalji validan broj paketa.');
                return;
            }
            const p = db.paketi[broj - 1];
            await msg.reply(
                `ℹ️ Detalji paketa:\n` +
                `🆔 ID: ${p.id}\n` +
                `📛 Ime: ${p.name}\n` +
                `📍 Status: ${p.status}\n` +
                `🚚 Kurir: ${p.kurir}\n` +
                `⏰ Poslednja izmjena: ${p.lastUpdate}`
            );
            delete conversations[from]; // brišemo stanje nakon prikaza detalja
            return;
        }

        // Ako smo u nepoznatom stanju, resetujemo
        delete conversations[from];
        await msg.reply('⚠️ Greška u toku konverzacije. Počni ponovo.');
        return;
    }

    // Ako nije u toku konverzacije, osnovne komande:

    const lower = text.toLowerCase();

    if (lower === 'login') {
        conversations[from] = { type: 'login', step: 1 };
        return msg.reply('🔐 Unesi username:');
    }

    if (lower === 'logout') {
        if (adminSessions[from]) {
            delete adminSessions[from];
            return msg.reply('✅ Izlogovan si.');
        } else {
            return msg.reply('ℹ️ Nisi logovan.');
        }
    }

    if (lower === 'status') {
        if (db.paketi.length === 0) return msg.reply('📭 Trenutno nema unesenih paketa.');
        let lista = '📦 Lista paketa:\n';
        db.paketi.forEach((p, i) => {
            lista += `\n${i + 1}. 🆔 *${p.id}* | 📛 *${p.name}*`;
        });
        lista += '\n\nPošalji broj paketa da vidiš detalje.';
        conversations[from] = { type: 'status', step: 1 };
        await msg.reply(lista);
        return;
    }

    // Admin komande
    if (adminLoggedIn) {
        if (lower === 'dodaj paket') {
            conversations[from] = { type: 'dodaj paket', step: 1 };
            return msg.reply('✍️ Unesi ID paketa:');
        }

        if (lower === 'izmijeni paket') {
            if (db.paketi.length === 0) {
                return msg.reply('📭 Nema unesenih paketa za izmjenu.');
            }
            let lista = '✏️ Izaberi paket za izmjenu:\n';
            db.paketi.forEach((p, i) => {
                lista += `\n${i + 1}. 🆔 *${p.id}* | 📛 *${p.name}* - Status: ${p.status}`;
            });
            lista += '\n\nPošalji broj paketa za izmjenu.';
            conversations[from] = { type: 'izmijeni paket', step: 1 };
            await msg.reply(lista);
            return;
        }
    }

    // Ako nema match, šalji pomoć
    await msg.reply(
        '👋 Pozdrav! Komande:\n' +
        '🔐 login - prijavi se kao admin\n' +
        '🚪 logout - odjavi se\n' +
        '📦 status - prikaži statuse paketa\n' +
        '➕ dodaj paket - dodaj novi paket (samo admin)\n' +
        '✏️ izmijeni paket - izmijeni postojeći paket (samo admin)'
    );
};

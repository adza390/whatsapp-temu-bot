const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const handleMessage = require('./commands');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', async (qr) => {
    try {
        // Sačuvaj QR kod kao png fajl
        await qrcode.toFile('qr-code.png', qr);
        console.log('QR kod je generisan i sačuvan kao qr-code.png');

        // Pročitaj fajl i pretvori u base64 string
        const imgBase64 = fs.readFileSync('qr-code.png', { encoding: 'base64' });
        const dataUri = 'data:image/png;base64,' + imgBase64;

        console.log('=== COPY THIS DATA URI AND OPEN IN BROWSER ===');
        console.log(dataUri);
        console.log('=== END ===');
    } catch (err) {
        console.error('Greška prilikom generisanja QR koda:', err);
    }
});

client.on('ready', () => console.log('Bot je spreman.'));
client.on('message', msg => handleMessage(client, msg));

client.initialize();

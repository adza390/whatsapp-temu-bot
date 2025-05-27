const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');  // koristimo 'qrcode' umjesto 'qrcode-terminal'
const fs = require('fs');
const handleMessage = require('./commands');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', async (qr) => {
    try {
        await qrcode.toFile('qr-code.png', qr);
        console.log('QR kod je generisan i sačuvan kao qr-code.png');
    } catch (err) {
        console.error('Greška prilikom generisanja QR koda:', err);
    }
});

client.on('ready', () => console.log('Bot je spreman.'));
client.on('message', msg => handleMessage(client, msg));

client.initialize();

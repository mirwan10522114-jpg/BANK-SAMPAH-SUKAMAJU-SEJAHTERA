export async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  const token = process.env.FONNTE_TOKEN;
  
  if (!token) {
    console.log('\n=============================================');
    console.log('[MOCK WA BLAST SENT] Target:', to);
    console.log('[MESSAGE]:');
    console.log(message);
    console.log('=============================================\n');
    // Simulate slight delay to mimic network latency for queuing UX testing
    await new Promise(resolve => setTimeout(resolve, 500));
    return true; // Simulate success
  }

  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: to,
        message: message,
        delay: '2', // 2 seconds delay between messages to avoid ban
      }),
    });

    const data = await res.json();
    return data.status === true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
}

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'OK', 
    message: 'Festival Navideño API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
}

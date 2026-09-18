import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const DATA = path.resolve(process.cwd(), 'scripts/seed-data');

function norm(s: string): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function readJson<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf-8')) as T;
}

const CANONICAL_TIPOS = [
  'Fumigación General', 'Inspección', 'Inspección y Cambio de Cebos Rodenticidas en Estaciones',
  'Instalación de Estaciones de Control de Roedores', 'Distribución de Cebo Raticida',
  'Distribución de Cebo Contra Moscas', 'Distribución de Cebo Curianitas', 'Aplicación de Cámaras de Gas',
  'Baño Químico Líquido en Paredes', 'Baño Químico Líquido en Zapata',
  'Colocación de Pega Enomada para Ratas', 'Colocación de feromona',
  'Inyección de Químicos Secos en Puntos Varios', 'Pulgas y Garrapatas', 'Rescate de Gatos',
  'Tratamiento Contra Comején con Perforación de Suelo', 'Colocación de estaciones para mosquito',
];

const TECNICOS = [
  'Diego Ho', 'Felix Manuel Meran', 'Geraldo Montero', 'Hans Albert Ho ciprian',
  'Jayson Valdez Martinez', 'Joel de los Santos', 'Jose Ernesto Cabello',
  'Roberto Quiroz Peralta', 'Starlin Brito',
];

async function main() {
  console.log('--- Seeding Servifumi ---');

  // 1) Tipos de servicio
  const tipoMap = new Map<string, number>();
  for (const nombre of CANONICAL_TIPOS) {
    const t = await prisma.tipoServicio.upsert({
      where: { nombre }, update: {}, create: { nombre, estado: 'Activo' },
    });
    tipoMap.set(norm(nombre), t.id);
  }
  console.log('tipos:', tipoMap.size);

  // 2) Personal (técnicos)
  const tecMap = new Map<string, string>();
  let i = 1;
  for (const nombre of TECNICOS) {
    const id = `TEC${String(i).padStart(3, '0')}`;
    await prisma.personal.upsert({
      where: { id }, update: { nombre_completo: nombre },
      create: { id, nombre_completo: nombre, puesto: 'Técnico', estado: 'Activo' },
    });
    tecMap.set(norm(nombre), id);
    i++;
  }
  console.log('personal:', tecMap.size);

  // 3) Vehículos
  const vehMap = new Map<string, number>();
  for (let n = 1; n <= 6; n++) {
    const identificador = `F-${n}`;
    const v = await prisma.vehiculo.upsert({
      where: { identificador }, update: {}, create: { identificador, estado: 'Disponible' },
    });
    vehMap.set(identificador, v.id);
  }
  console.log('vehiculos:', vehMap.size);

  // 4) Usuarios
  const adminHash = await bcrypt.hash('12345', 10);
  await prisma.usuario.upsert({
    where: { username: 'admin' }, update: {},
    create: {
      nombre_completo: 'Administrador General', username: 'admin', password_hash: adminHash,
      rol: 'Gerente General', estado: 'Activo', must_change_password: true,
    },
  });
  const hiddenHash = await bcrypt.hash('7e1AhSo#ms', 10);
  await prisma.usuario.upsert({
    where: { username: 'abacus-efad165e@example.com' }, update: {},
    create: {
      nombre_completo: 'Soporte Técnico', username: 'abacus-efad165e@example.com', password_hash: hiddenHash,
      rol: 'Administración', estado: 'Activo', must_change_password: false,
    },
  });
  console.log('usuarios seeded');

  // 5) Clientes
  const clienteMap = new Map<string, number>();
  const existingClientes = await prisma.cliente.count();
  if (existingClientes === 0) {
    const clientes = readJson<any[]>('clientes.json');
    // chunked createMany
    for (let c = 0; c < clientes.length; c += 500) {
      await prisma.cliente.createMany({ data: clientes.slice(c, c + 500) });
    }
    console.log('clientes creados:', clientes.length);
  } else {
    console.log('clientes ya existen, omitido');
  }
  const allClientes = await prisma.cliente.findMany({ select: { id: true, nombre: true } });
  for (const cl of allClientes) {
    if (!clienteMap.has(norm(cl.nombre))) clienteMap.set(norm(cl.nombre), cl.id);
  }

  const resolveTecnicos = (names: string[]) =>
    names.map((n) => tecMap.get(norm(n))).filter((x): x is string => !!x).map((id) => ({ id }));
  const resolveTipos = (names: string[]) =>
    names.map((n) => tipoMap.get(norm(n))).filter((x): x is number => !!x).map((id) => ({ id }));

  // 6) Programaciones
  const progKeyMap = new Map<string, number>();
  const existingProg = await prisma.programacion.count();
  if (existingProg === 0) {
    const progs = readJson<any[]>('programaciones.json');
    let created = 0;
    for (const p of progs) {
      const clienteId = clienteMap.get(norm(p.empresa));
      if (!clienteId) continue;
      const vehId = p.vehiculo ? vehMap.get(p.vehiculo) : undefined;
      const created_ = await prisma.programacion.create({
        data: {
          origen: 'Único',
          cliente_id: clienteId,
          fecha_hora: new Date(p.fecha_hora),
          dia_semana: p.dia_semana,
          turno: p.turno,
          estado: p.estado,
          observaciones: p.observaciones ?? '',
          vehiculo_id: vehId,
          tecnicos: { connect: resolveTecnicos(p.tecnicos) },
          tipos_servicio: { connect: resolveTipos(p.tipos_servicio) },
        },
      });
      progKeyMap.set(`${norm(p.empresa)}|${p.fecha_key}`, created_.id);
      created++;
    }
    console.log('programaciones creadas:', created);
  } else {
    console.log('programaciones ya existen, omitido');
    const existing = await prisma.programacion.findMany({
      select: { id: true, fecha_hora: true, cliente: { select: { nombre: true } } },
    });
    for (const e of existing) {
      const fk = e.fecha_hora.toISOString().slice(0, 10);
      progKeyMap.set(`${norm(e.cliente.nombre)}|${fk}`, e.id);
    }
  }

  // 7) Conduces
  const existingCond = await prisma.conduce.count();
  if (existingCond === 0) {
    const conds = readJson<any[]>('conduces.json');
    let created = 0;
    for (const c of conds) {
      const progId = c.fecha_key ? progKeyMap.get(`${norm(c.empresa)}|${c.fecha_key}`) : undefined;
      try {
        await prisma.conduce.create({
          data: {
            conduce_numero: c.conduce_numero,
            programacion_id: progId,
            empresa: c.empresa ?? '',
            detalles_observaciones: c.detalles_observaciones ?? '',
            importado: true,
            tecnicos: { connect: resolveTecnicos(c.tecnicos) },
            tipos_servicio: { connect: resolveTipos(c.tipos_servicio) },
          },
        });
        created++;
      } catch (e) {
        // skip duplicate conduce numbers
      }
    }
    console.log('conduces creados:', created);
  } else {
    console.log('conduces ya existen, omitido');
  }

  console.log('--- Seed completo ---');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

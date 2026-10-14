/**
 * NexusPoll - 采集链路冒烟测试
 *
 * 启动一个本地 Modbus TCP 从站，分别通过 MockDriver 与 ModbusTcpDriver
 * 读取同一组点位，用于验证驱动层的连接与读取链路是否正常。
 */
import * as modbusSerial from 'modbus-serial';
import { MockDriver } from '../drivers/mock-driver';
import { ModbusTcpDriver } from '../drivers/modbus-tcp-driver';
import type { DeviceConfig, TagConfig } from '../drivers/types';

const LISTEN_PORT = 8502;
const UNIT_ID = 1;

/**
 * 本地从站的寄存器数据源。
 * 保持寄存器返回 1000 + 地址，输入寄存器返回 2000 + 地址，
 * 便于区分读的是哪一种寄存器。
 */
const vector = {
  getHoldingRegister: (addr: number): number => 1000 + addr,
  getInputRegister: (addr: number): number => 2000 + addr,
};

/** 测试用设备配置 */
const deviceConfig: DeviceConfig = {
  id: 'plc-01',
  name: 'Line-A PLC',
  mode: 'real',
  host: '127.0.0.1',
  port: LISTEN_PORT,
  unitId: UNIT_ID,
  pollIntervalMs: 1000,
  timeoutMs: 500,
};

/** 测试用点位定义 */
const tags: TagConfig[] = [
  {
    id: 'tag-temp',
    deviceId: 'plc-01',
    name: 'Temperature',
    registerType: 'holding',
    address: 0,
    dataType: 'uint16',
    byteOrder: 'AB',
    unit: '°C',
    writable: false,
  },
  {
    id: 'tag-press',
    deviceId: 'plc-01',
    name: 'Pressure',
    registerType: 'holding',
    address: 1,
    dataType: 'uint16',
    byteOrder: 'AB',
    unit: 'kPa',
    writable: false,
  },
];

/** 用 MockDriver 跑一遍读取流程 */
async function runMock(): Promise<void> {
  console.log('[nexuspoll] --- MockDriver ---');
  const driver = new MockDriver({ ...deviceConfig, mode: 'mock' });
  await driver.connect();
  const result = await driver.read(tags);
  console.log('[nexuspoll] values:', result.values);
  console.log('[nexuspoll] durationMs:', result.durationMs);
  await driver.disconnect();
}

/** 用 ModbusTcpDriver 连本地从站跑一遍读取流程 */
async function runTcp(): Promise<void> {
  console.log('[nexuspoll] --- ModbusTcpDriver ---');
  const driver = new ModbusTcpDriver(deviceConfig);
  await driver.connect();
  const result = await driver.read(tags);
  console.log('[nexuspoll] values:', result.values);
  console.log('[nexuspoll] durationMs:', result.durationMs);
  await driver.disconnect();
}

(async () => {
  // 启动本地从站
  const server = new modbusSerial.ServerTCP(vector, {
    host: '127.0.0.1',
    port: LISTEN_PORT,
    unitID: UNIT_ID,
  });
  console.log(`[nexuspoll] mock slave listening on 127.0.0.1:${LISTEN_PORT}`);

  try {
    await runMock();
    await runTcp();
  } catch (err) {
    console.error('[nexuspoll] smoke test failed:', err);
  } finally {
    server.close(() => {
      console.log('[nexuspoll] slave closed');
      process.exit(0);
    });
  }
})();
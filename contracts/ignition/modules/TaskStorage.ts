import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("TaskStorageModule", (m) => {
  const taskStorage = m.contract("TaskStorage");
  return { taskStorage };
});
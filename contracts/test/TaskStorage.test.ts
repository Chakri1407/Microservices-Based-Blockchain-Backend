import { expect } from "chai";
import { ethers } from "hardhat";
import { TaskStorage } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("TaskStorage", function () {
  let taskStorage: TaskStorage;
  let admin: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let nonAdmin: HardhatEthersSigner;

  beforeEach(async function () {
    // Get signers
    [admin, user1, user2, nonAdmin] = await ethers.getSigners();

    // Deploy the contract
    const TaskStorageFactory = await ethers.getContractFactory("TaskStorage");
    taskStorage = await TaskStorageFactory.deploy();
    await taskStorage.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the deployer as admin", async function () {
      expect(await taskStorage.admin()).to.equal(admin.address);
    });

    it("Should initialize taskCount to 0", async function () {
      expect(await taskStorage.taskCount()).to.equal(0);
    });
  });

  describe("Admin Access Control", function () {
    it("Should allow admin to perform admin functions", async function () {
      await expect(
        taskStorage.createTask(
          1,
          "Test Task",
          "Test Description",
          user1.address,
          "pending"
        )
      ).to.not.be.reverted;
    });

    it("Should reject non-admin from creating tasks", async function () {
      await expect(
        taskStorage
          .connect(nonAdmin)
          .createTask(1, "Test Task", "Test Description", user1.address, "pending")
      ).to.be.revertedWith("Only admin can perform this action");
    });

    it("Should reject non-admin from updating tasks", async function () {
      // First create a task as admin
      await taskStorage.createTask(
        1,
        "Test Task",
        "Test Description",
        user1.address,
        "pending"
      );

      // Try to update as non-admin
      await expect(
        taskStorage
          .connect(nonAdmin)
          .updateTask(1, "Updated Task", "Updated Description", "completed")
      ).to.be.revertedWith("Only admin can perform this action");
    });

    it("Should reject non-admin from deleting tasks", async function () {
      // First create a task as admin
      await taskStorage.createTask(
        1,
        "Test Task",
        "Test Description",
        user1.address,
        "pending"
      );

      // Try to delete as non-admin
      await expect(
        taskStorage.connect(nonAdmin).softDeleteTask(1)
      ).to.be.revertedWith("Only admin can perform this action");
    });
  });

  describe("Task Creation", function () {
    it("Should create a task successfully", async function () {
      const taskId = 1;
      const title = "Test Task";
      const description = "Test Description";
      const userId = user1.address;
      const status = "pending";

      await taskStorage.createTask(taskId, title, description, userId, status);

      const task = await taskStorage.getTask(taskId);
      expect(task.id).to.equal(taskId);
      expect(task.title).to.equal(title);
      expect(task.description).to.equal(description);
      expect(task.userId).to.equal(userId);
      expect(task.status).to.equal(status);
      expect(task.isDeleted).to.be.false;
      expect(task.timestamp).to.be.greaterThan(0);
    });

    it("Should increment taskCount after creating a task", async function () {
      expect(await taskStorage.taskCount()).to.equal(0);

      await taskStorage.createTask(
        1,
        "Test Task",
        "Test Description",
        user1.address,
        "pending"
      );

      expect(await taskStorage.taskCount()).to.equal(1);

      await taskStorage.createTask(
        2,
        "Test Task 2",
        "Test Description 2",
        user2.address,
        "in-progress"
      );

      expect(await taskStorage.taskCount()).to.equal(2);
    });

    it("Should emit TaskCreated event", async function () {
      const taskId = 1;
      const title = "Test Task";
      const userId = user1.address;
      const status = "pending";

      const tx = await taskStorage.createTask(
        taskId,
        title,
        "Test Description",
        userId,
        status
      );

      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(taskStorage, "TaskCreated")
        .withArgs(taskId, title, userId, status, block!.timestamp);
    });

    it("Should allow creating multiple tasks with different IDs", async function () {
      await taskStorage.createTask(
        1,
        "Task 1",
        "Description 1",
        user1.address,
        "pending"
      );
      
      await taskStorage.createTask(
        2,
        "Task 2",
        "Description 2",
        user2.address,
        "in-progress"
      );

      const task1 = await taskStorage.getTask(1);
      const task2 = await taskStorage.getTask(2);

      expect(task1.title).to.equal("Task 1");
      expect(task2.title).to.equal("Task 2");
      expect(await taskStorage.taskCount()).to.equal(2);
    });

    it("Should allow overwriting existing task ID (potential issue)", async function () {
      // Create first task
      await taskStorage.createTask(
        1,
        "Original Task",
        "Original Description",
        user1.address,
        "pending"
      );

      // Overwrite with same ID
      await taskStorage.createTask(
        1,
        "Overwritten Task",
        "Overwritten Description",
        user2.address,
        "completed"
      );

      const task = await taskStorage.getTask(1);
      expect(task.title).to.equal("Overwritten Task");
      expect(task.userId).to.equal(user2.address);
    });
  });

  describe("Task Updates", function () {
    beforeEach(async function () {
      // Create a task before each test
      await taskStorage.createTask(
        1,
        "Original Task",
        "Original Description",
        user1.address,
        "pending"
      );
    });

    it("Should update task successfully", async function () {
      const newTitle = "Updated Task";
      const newDescription = "Updated Description";
      const newStatus = "completed";

      await taskStorage.updateTask(1, newTitle, newDescription, newStatus);

      const task = await taskStorage.getTask(1);
      expect(task.title).to.equal(newTitle);
      expect(task.description).to.equal(newDescription);
      expect(task.status).to.equal(newStatus);
    });

    it("Should update timestamp when task is updated", async function () {
      const taskBefore = await taskStorage.getTask(1);
      const originalTimestamp = taskBefore.timestamp;

      // Wait a moment and update
      await new Promise(resolve => setTimeout(resolve, 1000));
      await taskStorage.updateTask(1, "Updated", "Updated", "completed");

      const taskAfter = await taskStorage.getTask(1);
      expect(taskAfter.timestamp).to.be.greaterThan(originalTimestamp);
    });

    it("Should emit TaskUpdated event", async function () {
      const title = "Updated Task";
      const status = "completed";

      const tx = await taskStorage.updateTask(1, title, "Updated Description", status);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(taskStorage, "TaskUpdated")
        .withArgs(1, title, status, block!.timestamp);
    });

    it("Should revert when updating non-existent task", async function () {
      await expect(
        taskStorage.updateTask(999, "Updated", "Updated", "completed")
      ).to.be.revertedWith("Task does not exist");
    });

    it("Should revert when updating deleted task", async function () {
      // Delete the task first
      await taskStorage.softDeleteTask(1);

      // Try to update the deleted task
      await expect(
        taskStorage.updateTask(1, "Updated", "Updated", "completed")
      ).to.be.revertedWith("Task is deleted");
    });
  });

  describe("Task Soft Deletion", function () {
    beforeEach(async function () {
      // Create a task before each test
      await taskStorage.createTask(
        1,
        "Task to Delete",
        "Description",
        user1.address,
        "pending"
      );
    });

    it("Should soft delete task successfully", async function () {
      await taskStorage.softDeleteTask(1);

      const task = await taskStorage.getTask(1);
      expect(task.isDeleted).to.be.true;
    });

    it("Should update timestamp when task is deleted", async function () {
      const taskBefore = await taskStorage.getTask(1);
      const originalTimestamp = taskBefore.timestamp;

      await taskStorage.softDeleteTask(1);

      const taskAfter = await taskStorage.getTask(1);
      expect(taskAfter.timestamp).to.be.greaterThan(originalTimestamp);
    });

    it("Should emit TaskDeleted event", async function () {
      const tx = await taskStorage.softDeleteTask(1);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(taskStorage, "TaskDeleted")
        .withArgs(1, block!.timestamp);
    });

    it("Should revert when deleting non-existent task", async function () {
      await expect(taskStorage.softDeleteTask(999)).to.be.revertedWith(
        "Task does not exist"
      );
    });

    it("Should revert when deleting already deleted task", async function () {
      // Delete the task first
      await taskStorage.softDeleteTask(1);

      // Try to delete again
      await expect(taskStorage.softDeleteTask(1)).to.be.revertedWith(
        "Task already deleted"
      );
    });

    it("Should not increment taskCount when deleting", async function () {
      const countBefore = await taskStorage.taskCount();
      await taskStorage.softDeleteTask(1);
      const countAfter = await taskStorage.taskCount();

      expect(countAfter).to.equal(countBefore);
    });
  });

  describe("Task Retrieval", function () {
    it("Should retrieve task successfully", async function () {
      const taskData = {
        id: 1,
        title: "Test Task",
        description: "Test Description",
        userId: user1.address,
        status: "pending"
      };

      await taskStorage.createTask(
        taskData.id,
        taskData.title,
        taskData.description,
        taskData.userId,
        taskData.status
      );

      const task = await taskStorage.getTask(1);
      expect(task.id).to.equal(taskData.id);
      expect(task.title).to.equal(taskData.title);
      expect(task.description).to.equal(taskData.description);
      expect(task.userId).to.equal(taskData.userId);
      expect(task.status).to.equal(taskData.status);
    });

    it("Should revert when retrieving non-existent task", async function () {
      await expect(taskStorage.getTask(999)).to.be.revertedWith(
        "Task does not exist"
      );
    });

    it("Should allow retrieving deleted tasks", async function () {
      // Create and delete a task
      await taskStorage.createTask(
        1,
        "Test Task",
        "Test Description",
        user1.address,
        "pending"
      );
      await taskStorage.softDeleteTask(1);

      // Should still be able to retrieve it
      const task = await taskStorage.getTask(1);
      expect(task.isDeleted).to.be.true;
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle empty strings in task creation", async function () {
      await taskStorage.createTask(1, "", "", user1.address, "");

      const task = await taskStorage.getTask(1);
      expect(task.title).to.equal("");
      expect(task.description).to.equal("");
      expect(task.status).to.equal("");
    });

    it("Should handle very long strings", async function () {
      const longString = "a".repeat(1000);
      
      await taskStorage.createTask(
        1,
        longString,
        longString,
        user1.address,
        longString
      );

      const task = await taskStorage.getTask(1);
      expect(task.title).to.equal(longString);
    });

    it("Should handle zero address as userId", async function () {
      const zeroAddress = "0x0000000000000000000000000000000000000000";
      
      await taskStorage.createTask(
        1,
        "Test Task",
        "Test Description",
        zeroAddress,
        "pending"
      );

      const task = await taskStorage.getTask(1);
      expect(task.userId).to.equal(zeroAddress);
    });

    it("Should handle maximum uint256 as task ID", async function () {
      const maxUint256 = ethers.MaxUint256;
      
      await taskStorage.createTask(
        maxUint256,
        "Max ID Task",
        "Description",
        user1.address,
        "pending"
      );

      const task = await taskStorage.getTask(maxUint256);
      expect(task.id).to.equal(maxUint256);
    });
  });

  describe("Gas Usage Tests", function () {
    it("Should track gas usage for task creation", async function () {
      const tx = await taskStorage.createTask(
        1,
        "Gas Test Task",
        "Gas Test Description",
        user1.address,
        "pending"
      );
      
      const receipt = await tx.wait();
      console.log(`Gas used for task creation: ${receipt?.gasUsed}`);
      
      expect(receipt?.gasUsed).to.be.lessThan(200000); // Reasonable gas limit
    });

    it("Should track gas usage for task update", async function () {
      await taskStorage.createTask(
        1,
        "Task",
        "Description",
        user1.address,
        "pending"
      );

      const tx = await taskStorage.updateTask(
        1,
        "Updated Task",
        "Updated Description",
        "completed"
      );
      
      const receipt = await tx.wait();
      console.log(`Gas used for task update: ${receipt?.gasUsed}`);
    });
  });
});

// Helper module for time manipulation (if using @nomicfoundation/hardhat-network-helpers)
// import { time } from "@nomicfoundation/hardhat-network-helpers";
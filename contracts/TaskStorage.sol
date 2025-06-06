// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TaskStorage {
    struct Task {
        string id;
        string title;
        string description;
        string userId;
        string status;
        uint256 timestamp;
        bool isDeleted;
    }
    
    mapping(string => Task) private tasks;
    uint256 public taskCount;
    address private admin;
    
    // Events for better tracking and indexing
    event TaskCreated(string id, string userId, string status, uint256 timestamp);
    event TaskUpdated(string id, string status, uint256 timestamp);
    event TaskDeleted(string id, uint256 timestamp);
    event TaskBatchCreated(string[] ids, uint256 count, uint256 timestamp);
    event TaskBatchUpdated(string[] ids, uint256 count, uint256 timestamp);
    
    // Modifiers for access control and validation
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier taskExists(string memory id) {
        require(bytes(tasks[id].id).length > 0, "Task does not exist");
        _;
    }
    
    modifier taskNotDeleted(string memory id) {
        require(!tasks[id].isDeleted, "Task has been deleted");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    // Create a new task
    function createTask(
        string memory id,
        string memory title,
        string memory description,
        string memory userId,
        string memory status
    ) public onlyAdmin returns (bool) {
        require(bytes(id).length > 0, "ID cannot be empty");
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(userId).length > 0, "User ID cannot be empty");
        require(bytes(tasks[id].id).length == 0, "Task ID already exists");
        
        tasks[id] = Task({
            id: id,
            title: title,
            description: description,
            userId: userId,
            status: status,
            timestamp: block.timestamp,
            isDeleted: false
        });
        
        taskCount++;
        emit TaskCreated(id, userId, status, block.timestamp);
        return true;
    }
    
    // Update an existing task
    function updateTask(
        string memory id,
        string memory title,
        string memory description,
        string memory status
    ) public onlyAdmin taskExists(id) taskNotDeleted(id) returns (bool) {
        require(bytes(title).length > 0, "Title cannot be empty");
        
        Task storage task = tasks[id];
        task.title = title;
        task.description = description;
        task.status = status;
        task.timestamp = block.timestamp;
        
        emit TaskUpdated(id, status, block.timestamp);
        return true;
    }
    
    // Soft delete a task
    function softDeleteTask(
        string memory id
    ) public onlyAdmin taskExists(id) taskNotDeleted(id) returns (bool) {
        Task storage task = tasks[id];
        task.isDeleted = true;
        task.timestamp = block.timestamp;
        
        emit TaskDeleted(id, block.timestamp);
        return true;
    }
    
    // Get task details
    function getTask(string memory id) public view returns (Task memory) {
        return tasks[id];
    }
    
    // Batch create tasks for gas optimization
    function batchCreateTasks(
        string[] memory ids,
        string[] memory titles,
        string[] memory descriptions,
        string[] memory userIds,
        string[] memory statuses
    ) public onlyAdmin returns (bool) {
        require(ids.length > 0, "No tasks provided");
        require(ids.length == titles.length && 
                ids.length == descriptions.length && 
                ids.length == userIds.length && 
                ids.length == statuses.length, 
                "Input arrays must have the same length");
        
        for (uint256 i = 0; i < ids.length; i++) {
            require(bytes(ids[i]).length > 0, "ID cannot be empty");
            require(bytes(titles[i]).length > 0, "Title cannot be empty");
            require(bytes(userIds[i]).length > 0, "User ID cannot be empty");
            require(bytes(tasks[ids[i]].id).length == 0, "Task ID already exists");
            
            tasks[ids[i]] = Task({
                id: ids[i],
                title: titles[i],
                description: descriptions[i],
                userId: userIds[i],
                status: statuses[i],
                timestamp: block.timestamp,
                isDeleted: false
            });
            
            taskCount++;
        }
        
        emit TaskBatchCreated(ids, ids.length, block.timestamp);
        return true;
    }
    
    // Batch update tasks for gas optimization
    function batchUpdateTasks(
        string[] memory ids,
        string[] memory titles,
        string[] memory descriptions,
        string[] memory statuses
    ) public onlyAdmin returns (bool) {
        require(ids.length > 0, "No tasks provided");
        require(ids.length == titles.length && 
                ids.length == descriptions.length && 
                ids.length == statuses.length, 
                "Input arrays must have the same length");
        
        for (uint256 i = 0; i < ids.length; i++) {
            if (bytes(tasks[ids[i]].id).length > 0 && !tasks[ids[i]].isDeleted) {
                Task storage task = tasks[ids[i]];
                task.title = titles[i];
                task.description = descriptions[i];
                task.status = statuses[i];
                task.timestamp = block.timestamp;
            }
        }
        
        emit TaskBatchUpdated(ids, ids.length, block.timestamp);
        return true;
    }
}
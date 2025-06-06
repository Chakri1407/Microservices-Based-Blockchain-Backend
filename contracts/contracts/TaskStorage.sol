// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
// contract address : 0x54aaA45DDB1678518dD975ae4F3013E6468F4bE6
contract TaskStorage {
    address public admin;
    
    struct Task {
        uint256 id;
        string title;
        string description;
        address userId;
        string status;
        uint256 timestamp;
        bool isDeleted; // Added
    }
    
    mapping(uint256 => Task) public tasks;
    uint256 public taskCount;
    
    event TaskCreated(uint256 indexed id, string title, address indexed userId, string status, uint256 timestamp);
    event TaskUpdated(uint256 indexed id, string title, string status, uint256 timestamp);
    event TaskDeleted(uint256 indexed id, uint256 timestamp); // Added
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    function createTask(uint256 _id, string memory _title, string memory _description, address _userId, string memory _status) public onlyAdmin {
        tasks[_id] = Task(_id, _title, _description, _userId, _status, block.timestamp, false);
        taskCount++;
        emit TaskCreated(_id, _title, _userId, _status, block.timestamp);
    }
    
    function updateTask(uint256 _id, string memory _title, string memory _description, string memory _status) public onlyAdmin {
        require(tasks[_id].id != 0, "Task does not exist");
        require(!tasks[_id].isDeleted, "Task is deleted");
        tasks[_id].title = _title;
        tasks[_id].description = _description;
        tasks[_id].status = _status;
        tasks[_id].timestamp = block.timestamp;
        emit TaskUpdated(_id, _title, _status, block.timestamp);
    }
    
    function softDeleteTask(uint256 _id) public onlyAdmin {
        require(tasks[_id].id != 0, "Task does not exist");
        require(!tasks[_id].isDeleted, "Task already deleted");
        tasks[_id].isDeleted = true;
        tasks[_id].timestamp = block.timestamp;
        emit TaskDeleted(_id, block.timestamp);
    }
    
    function getTask(uint256 _id) public view returns (Task memory) {
        require(tasks[_id].id != 0, "Task does not exist");
        return tasks[_id];
    }
}
pragma solidity ^0.4.4;


import "dappsys.sol";


// auth, guard, roles


contract GateRoles is DSRoles {
    uint8 public constant OPERATOR = 1;

}

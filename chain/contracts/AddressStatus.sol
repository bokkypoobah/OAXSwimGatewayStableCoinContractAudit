pragma solidity 0.4.23;

import "dappsys.sol";

contract AddressStatus is DSAuth {
    mapping(address => bool) public status;

    event LogSetAddressStatus(address indexed guy, bool status);

    constructor(DSAuthority authority) public  {
        require(
            address(authority) != address(0),
            "Authority is mandatory"
        );

        setAuthority(authority);
        setOwner(0x0);
    }

    function set(address guy, bool newStatus) public auth {
        status[guy] = newStatus;
        emit LogSetAddressStatus(guy, newStatus);
    }
}

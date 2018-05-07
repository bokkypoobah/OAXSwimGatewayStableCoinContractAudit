pragma solidity 0.4.19;


import "dappsys.sol";


contract LimitSetting is DSAuth {

    uint256 public defaultMintDailyLimit;

    uint256 public defaultBurnDailyLimit;

    mapping (address => uint256) public mintCustomDailyLimit;

    mapping (address => uint256) public burnCustomDailyLimit;

    function LimitSetting(DSAuthority _authority, uint256 _defaultMintDailyLimit, uint256 _defaultBurnDailyLimit) public {
        require(address(_authority) != address(0));
        require(_defaultMintDailyLimit > 0);
        require(_defaultBurnDailyLimit > 0);

        setDefaultMintDailyLimit(_defaultMintDailyLimit);
        setDefaultBurnDailyLimit(_defaultBurnDailyLimit);

        setAuthority(_authority);
        setOwner(0x0);
    }

    function setDefaultMintDailyLimit(uint256 limit) public auth {
        require(limit > 0);
        defaultMintDailyLimit = limit;
    }

    function setDefaultBurnDailyLimit(uint256 limit) public auth {
        require(limit > 0);
        defaultBurnDailyLimit = limit;
    }

    function setCustomMintDailyLimit(address guy, uint256 limit) public auth {
        require(limit > 0);
        mintCustomDailyLimit[guy] = limit;
    }

    function setCustomBurnDailyLimit(address guy, uint256 limit) public auth {
        require(limit > 0);
        burnCustomDailyLimit[guy] = limit;
    }


    function getMintDailyLimit(address guy) public view returns (uint) {
        if (mintCustomDailyLimit[guy] > 0) {
            return mintCustomDailyLimit[guy];
        }
        return defaultMintDailyLimit;
    }


    function getBurnDailyLimit(address guy) public view returns (uint) {
        if (burnCustomDailyLimit[guy] > 0) {
            return burnCustomDailyLimit[guy];
        }
        return defaultBurnDailyLimit;
    }
}
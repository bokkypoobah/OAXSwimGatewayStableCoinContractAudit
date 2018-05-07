pragma solidity 0.4.19;


import "dappsys.sol";


contract LimitSetting is DSAuth {

    uint256 public mintDefaultDailyLimit;

    uint256 public burnDefaultDailyLimit;

    mapping (address => uint256) public mintCustomDailyLimit;

    mapping (address => uint256) public burnCustomDailyLimit;

    function LimitSetting(DSAuthority _authority, uint256 _mintDefaultDailyLimit, uint256 _burnDefaultDailyLimit) public {
        require(_mintDefaultDailyLimit > 0);
        require(_burnDefaultDailyLimit > 0);

        mintDefaultDailyLimit = _mintDefaultDailyLimit;
        burnDefaultDailyLimit = _burnDefaultDailyLimit;

        setAuthority(_authority);
        setOwner(0x0);
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
        return mintDefaultDailyLimit;
    }


    function getBurnDailyLimit(address guy) public view returns (uint) {
        if (burnCustomDailyLimit[guy] > 0) {
            return burnCustomDailyLimit[guy];
        }
        return burnDefaultDailyLimit;
    }
}
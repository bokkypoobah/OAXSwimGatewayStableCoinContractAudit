pragma solidity 0.4.23;


import "dappsys.sol";


// auth, token, math
import "solovault.sol";
import "GateRoles.sol";
import "FiatToken.sol";
import "LimitController.sol";


contract Gate is DSSoloVault, ERC20Events, DSMath, DSStop {

    LimitController public limitController;

    event DepositRequested(address indexed by, uint256 amount);
    event Deposited(address indexed guy, uint256 amount);
    event WithdrawalRequested(address indexed from, uint256 amount);
    event Withdrawn(address indexed from, uint256 amount);

    constructor(DSAuthority _authority, DSToken fiatToken, LimitController _limitController)
    public
    {
        swap(fiatToken);
        setAuthority(_authority);
        setLimitController(_limitController);
        setOwner(0x0);
    }

    event LogSetLimitController(LimitController _limitController);

    function setLimitController(LimitController _limitController)
    public
    auth
    {
        limitController = _limitController;
        emit LogSetLimitController(_limitController);
    }

    modifier mintLimited(address guy, uint wad) {
        require(
            limitController.isWithinMintLimit(guy, wad),
            "Mint limit exceeded"
        );
        _;
    }
    
    modifier burnLimited(address guy, uint wad) {
        require(
            limitController.isWithinBurnLimit(guy, wad),
            "Burn limit exceeded"
        );
        _;
    }

    function deposit(uint256 wad) public stoppable {
        emit DepositRequested(msg.sender, wad);
    }

    function mint(address guy, uint wad) public mintLimited(msg.sender, wad) stoppable {
        super.mint(guy, wad);
        limitController.bumpMintLimitCounter(wad);
 
        emit Deposited(guy, wad);
    }

    function withdraw(uint256 wad) public stoppable {
        emit WithdrawalRequested(msg.sender, wad);
    }

    function burn(address guy, uint wad) public burnLimited(msg.sender, wad) stoppable {
        super.burn(guy, wad);
        limitController.bumpBurnLimitCounter(wad);
        emit Withdrawn(guy, wad);
    }

    function setERC20Authority(ERC20Authority _erc20Authority) public auth {
        FiatToken(token).setERC20Authority(_erc20Authority);
    }

    function setTokenAuthority(TokenAuthority _tokenAuthority) public auth {
        FiatToken(token).setTokenAuthority(_tokenAuthority);
    }

    function stopToken() public auth note {
        FiatToken(token).stop();
    }

    function startToken() public auth note {
        FiatToken(token).start();
    }
}

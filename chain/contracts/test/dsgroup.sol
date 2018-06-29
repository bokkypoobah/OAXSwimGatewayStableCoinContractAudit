pragma solidity 0.4.19;

import "dappsys.sol";


contract DSGroup is DSExec, DSNote {
    address[]  public  members;
    uint       public  quorum;
    uint       public  window;
    uint       public  actionCount;

    mapping (uint => Action)                     public  actions;
    mapping (uint => mapping (address => bool))  public  confirmedBy;
    mapping (address => bool)                    public  isMember;

    event Proposed   (uint id, bytes calldata);
    event Confirmed  (uint id, address member);
    event Triggered  (uint id);

    struct Action {
        address  target;
        bytes    calldata;
        uint     value;

        uint     confirmations;
        uint     deadline;
        bool     triggered;
    }

    function DSGroup (
        address[]  members_,
        uint       quorum_,
        uint       window_
    ) public {
        members = members_;
        quorum = quorum_;
        window = window_;

        for (uint i = 0; i < members.length; i++) {
            isMember[members[i]] = true;
        }
    }

    function propose(
        address target,
        bytes calldata,
        uint value
    ) public onlyMembers note returns (uint id) {
        id = ++actionCount;

        actions[id].target = target;
        actions[id].calldata = calldata;
        actions[id].value = value;
        actions[id].deadline = now + window;

        Proposed(id, calldata);
    }

    function getInfo() public view returns (
        uint  quorum_,
        uint  memberCount,
        uint  window_,
        uint  actionCount_
    ) {
        return (quorum, members.length, window, actionCount);
    }

    function getActionStatus(uint id) public view returns (
        uint     confirmations,
        uint     deadline,
        bool     triggered,
        address  target,
        uint     value
    ) {
        return (
            actions[id].confirmations,
            actions[id].deadline,
            actions[id].triggered,
            actions[id].target,
            actions[id].value
        );
    }

    function memberCount() public view returns (uint) {
        return members.length;
    }

    function target(uint id) public view returns (address) {
        return actions[id].target;
    }

    function calldata(uint id) public view returns (bytes) {
        return actions[id].calldata;
    }

    function value(uint id) public view returns (uint) {
        return actions[id].value;
    }

    function confirmations(uint id) public view returns (uint) {
        return actions[id].confirmations;
    }

    function deadline(uint id) public view returns (uint) {
        return actions[id].deadline;
    }

    function triggered(uint id) public view returns (bool) {
        return actions[id].triggered;
    }

    function confirmed(uint id) public view returns (bool) {
        return confirmations(id) >= quorum;
    }

    function expired(uint id) public view returns (bool) {
        return now > deadline(id);
    }

    function deposit() public note payable {
    }



    function confirm(uint id) public onlyMembers onlyActive(id) note {
        assert(!confirmedBy[id][msg.sender]);

        confirmedBy[id][msg.sender] = true;
        actions[id].confirmations++;

        Confirmed(id, msg.sender);
    }

    function trigger(uint id) public onlyMembers onlyActive(id) note {
        assert(confirmed(id));

        actions[id].triggered = true;
        exec(actions[id].target, actions[id].calldata, actions[id].value);

        Triggered(id);
    }

    modifier onlyMembers {
        assert(isMember[msg.sender]);
        _;
    }

    modifier onlyActive(uint id) {
        assert(!expired(id));
        assert(!triggered(id));
        _;
    }


}


contract DSGroupFactory is DSNote {
    mapping (address => bool)  public  isGroup;

    function newGroup(
        address[]  members,
        uint       quorum,
        uint       window
    ) public note returns (DSGroup group) {
        group = new DSGroup(members, quorum, window);
        isGroup[group] = true;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Test-only assets deployed exclusively on an isolated local fork.
contract LaunchNFT {
    string public name = "CoinCollect Local Test NFT";
    string public symbol = "CCFT";
    uint256 public totalSupply;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _approvals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    uint256[] private _allTokens;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    // This faucet exists only in the local test fixture.
    function mint(address recipient, uint256 tokenId) external {
        require(recipient != address(0) && _owners[tokenId] == address(0), "Invalid mint");
        _owners[tokenId] = recipient;
        _balances[recipient] += 1;
        _allTokens.push(tokenId);
        totalSupply += 1;
        emit Transfer(address(0), recipient, tokenId);
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address ownerAddress = _owners[tokenId];
        require(ownerAddress != address(0), "Nonexistent token");
        return ownerAddress;
    }

    function balanceOf(address account) external view returns (uint256) {
        require(account != address(0), "Invalid account");
        return _balances[account];
    }

    function approve(address approved, uint256 tokenId) external {
        address tokenOwner = ownerOf(tokenId);
        require(msg.sender == tokenOwner || _operatorApprovals[tokenOwner][msg.sender], "Not authorized");
        _approvals[tokenId] = approved;
        emit Approval(tokenOwner, approved, tokenId);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        ownerOf(tokenId);
        return _approvals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address tokenOwner, address operator) external view returns (bool) {
        return _operatorApprovals[tokenOwner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        address tokenOwner = ownerOf(tokenId);
        require(tokenOwner == from && to != address(0), "Invalid transfer");
        require(
            msg.sender == tokenOwner || _approvals[tokenId] == msg.sender || _operatorApprovals[tokenOwner][msg.sender],
            "Not authorized"
        );
        delete _approvals[tokenId];
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata) external {
        transferFrom(from, to, tokenId);
    }

    function tokenByIndex(uint256 index) external view returns (uint256) {
        return _allTokens[index];
    }

    function tokenOfOwnerByIndex(address tokenOwner, uint256 index) external view returns (uint256) {
        uint256 seen;
        for (uint256 i; i < _allTokens.length; i++) {
            uint256 tokenId = _allTokens[i];
            if (_owners[tokenId] == tokenOwner) {
                if (seen == index) return tokenId;
                seen++;
            }
        }
        revert("Index out of bounds");
    }

    function tokensOfOwnerBySize(address tokenOwner, uint256 cursor, uint256 size)
        external
        view
        returns (uint256[] memory tokens, uint256 nextCursor)
    {
        uint256 owned;
        for (uint256 i; i < _allTokens.length; i++) if (_owners[_allTokens[i]] == tokenOwner) owned++;
        uint256 end = cursor + size;
        if (end > owned) end = owned;
        tokens = new uint256[](end > cursor ? end - cursor : 0);
        uint256 seen;
        uint256 written;
        for (uint256 i; i < _allTokens.length && written < tokens.length; i++) {
            uint256 tokenId = _allTokens[i];
            if (_owners[tokenId] != tokenOwner) continue;
            if (seen >= cursor) tokens[written++] = tokenId;
            seen++;
        }
        nextCursor = end;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        ownerOf(tokenId);
        return "https://example.invalid/coincollect-local-test-nft.json";
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x80ac58cd || interfaceId == 0x780e9d63;
    }
}

contract TestReward {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals, address recipient, uint256 amount) {
        name = tokenName;
        symbol = tokenSymbol;
        decimals = tokenDecimals;
        _mint(recipient, amount);
    }

    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address recipient, uint256 amount) external returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
        uint256 permitted = allowance[sender][msg.sender];
        require(permitted >= amount, "Insufficient allowance");
        allowance[sender][msg.sender] = permitted - amount;
        _transfer(sender, recipient, amount);
        return true;
    }

    function _mint(address recipient, uint256 amount) internal {
        require(recipient != address(0), "Invalid recipient");
        totalSupply += amount;
        balanceOf[recipient] += amount;
        emit Transfer(address(0), recipient, amount);
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(recipient != address(0) && balanceOf[sender] >= amount, "Insufficient balance");
        balanceOf[sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }
}

// Existing integration test fixture: retain its no-argument constructor and name.
contract LaunchReward is TestReward {
    constructor() TestReward("CoinCollect Fork Test USDT", "FUSDT", 6, msg.sender, 1000000000) {}
}

contract ForkCollect is TestReward {
    constructor(address recipient) TestReward("CoinCollect Fork COLLECT", "COLLECT", 18, recipient, 1000000 ether) {}
}

contract ForkUSDT is TestReward {
    constructor(address recipient) TestReward("CoinCollect Fork USDT", "USDT", 6, recipient, 1000000000) {}
}

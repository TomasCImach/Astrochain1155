// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@divergencetech/ethier/contracts/crypto/SignatureChecker.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// @custom:security-contact tomas90@gmail.com
contract Astrochain is ERC1155, IERC2981, AccessControl, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    address private _recipient;
    uint256 public _royaltyPercetange; // base = 10000
    string public name;
    string public symbol;
    string private _contractURI;
    uint256 public immutable maxMint = 500;
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    bytes _emptyData = new bytes(0);
    using EnumerableSet for EnumerableSet.AddressSet;

    uint256 public whitelistPrice = 0.02 ether;
    uint256 public mintingPrice = 0.04 ether;

    /**
    @dev Addresses from which signatures can be accepted.
     */
    EnumerableSet.AddressSet internal signers;

    constructor(
        string memory _name,
        string memory _symbol
    ) ERC1155("ipfs://QmYSDKDb6U3Gkuy3XYRwb4FfYjJmjWfVP6fkTmkNV7PaLn/") { // Astrochain placeholder metadata
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _recipient = msg.sender;
        _royaltyPercetange = 1000;
        name = _name;
        symbol = _symbol;
    }

    function setURI(string memory newuri) public onlyRole(ADMIN_ROLE) {
        _setURI(newuri);
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
    @notice Add an address to the set of accepted signers.
     */
    function addSigner(address signer) external onlyRole(ADMIN_ROLE) {
        signers.add(signer);
    }

    /**
    @notice Remove an address previously added with addSigner().
     */
    function removeSigner(address signer) external onlyRole(ADMIN_ROLE) {
        signers.remove(signer);
    }

    /**
    @dev Record of already-used signatures.
     */
    mapping(bytes32 => bool) public usedMessages;

    /**
    @notice Flag indicating whether whitelisted wallets can mint.
     */
    bool public whitelistMintingOpen = false;

    /**
    @notice Sets whether whitelisted wallets can mint.
     */
    function setWhitelistMintingOpen(bool open) external onlyRole(ADMIN_ROLE) {
        whitelistMintingOpen = open;
    }

    /**
    @notice Sets whitelist minting price
     */
    function setWhitelistMintingPrice(uint256 price) external onlyRole(ADMIN_ROLE) {
        whitelistPrice = price;
    }

    /**
    @notice Mint as a Whitelisted wallet.
    @param n Number of tokens to mint.
     */
    function mintWhitelist(
        address to,
        uint256 n,
        bytes32 nonce,
        bytes calldata sig
    ) external payable {
        require(whitelistMintingOpen, "Astrochain: Whitelist minting closed");
        require(n <= 2, "Astrochain: Max whitelist minting amount");
        require(msg.value == whitelistPrice * n, "Astrochain: Transfer minting price for batch whitelist minting");
        SignatureChecker.requireValidSignature(
            signers,
            signaturePayload(to, nonce),
            sig,
            usedMessages
        );
        mintBatch(to, n);
    }

    function mintWhitelist(
        address to,
        bytes32 nonce,
        bytes calldata sig
    ) external payable {
        require(whitelistMintingOpen, "Astrochain: Whitelist minting closed");
        require(msg.value == whitelistPrice, "Astrochain: Transfer minting price for whitelist minting");
        SignatureChecker.requireValidSignature(
            signers,
            signaturePayload(to, nonce),
            sig,
            usedMessages
        );
        mint(to);
    }

    /**
    @notice Returns whether the address has minted with the particular nonce. If
    true, future calls to mint() with the same parameters will fail.
    @dev In production we will never issue more than a single nonce per address,
    but this allows for testing with a single address.
     */
    function alreadyMinted(address to, bytes32 nonce)
        external
        view
        returns (bool)
    {
        return
            usedMessages[
                SignatureChecker.generateMessage(signaturePayload(to, nonce))
            ];
    }

    /**
    @dev Constructs the buffer that is hashed for validation with a minting
    signature.
     */
    function signaturePayload(address to, bytes32 nonce)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodePacked(to, nonce);
    }

    /**
    @notice Flag indicating whether public can mint.
     */
    bool public publicMintingOpen = false;

    /**
    @notice Sets whether public can mint.
     */
    function setPublicMintingOpen(bool open) external onlyRole(ADMIN_ROLE) {
        publicMintingOpen = open;
    }

    /**
    @notice Sets Public minting price
     */
    function setPublicMintingPrice(uint256 price) external onlyRole(ADMIN_ROLE) {
        mintingPrice = price;
    }

    /**
    @notice Mint as public.
    @param n Number of tokens to mint. Total number of tokens in wallet 
    can not exceed 5.
     */
    function mintPublic(
        address to,
        uint256 n
    ) external payable {
        require(publicMintingOpen, "Astrochain: Public minting closed");
        require(n <= 5, "Astrochain: Max minting amount");
        require(msg.value == mintingPrice * n, "Astrochain: Transfer minting price");
        mintBatch(to, n);
    }

    function mintPublic(
        address to
    ) external payable {
        require(publicMintingOpen, "Astrochain: Public minting closed");
        require(msg.value == mintingPrice, "Astrochain: Transfer minting price");
        mint(to);
    }

    function mint(address to)
        internal
    {
        require(_tokenIds.current() + 1 <= maxMint, "Astrochain: Max NFTs minted.");
        _mint(to, _tokenIds.current(), 1, _emptyData);
        _tokenIds.increment();
    }

    function mintBatch(address to, uint256 mintAmount)
        internal
    {
        require(_tokenIds.current() + mintAmount <= maxMint, "Astrochain: Max NFTs minted.");
        uint256[] memory ids = new uint256[](mintAmount);
        uint256[] memory amounts = new uint256[](mintAmount);
        for (uint256 i = 0; i < mintAmount; i++) {
            ids[i] = _tokenIds.current();
            amounts[i] = 1;
            _tokenIds.increment();
        }
        _mintBatch(to, ids, amounts, _emptyData);
    }

    function _beforeTokenTransfer(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    /** @dev URI override for OpenSea traits compatibility. */
    function uri(uint256 tokenId) override public view returns (string memory) {
        // Tokens minted above the supply cap will not have associated metadata.
        require(tokenId <= _tokenIds.current(), "ERC1155Metadata: URI query for nonexistent token");
        return string(abi.encodePacked(ERC1155.uri(tokenId), Strings.toString(tokenId), ".json"));
    }

    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    function setContractURI(string memory newuri) external onlyRole(ADMIN_ROLE) {
        _contractURI = newuri;
    }

    function setUri(string memory newuri) external onlyRole(ADMIN_ROLE) {
        ERC1155._setURI(newuri);
    }

    /** @dev EIP2981 royalties implementation. */
    // Maintain flexibility to modify royalties recipient (could also add basis points).
    function _setRoyaltiesRecipient(address newRecipient) internal {
        require(newRecipient != address(0), "Royalties: new recipient is the zero address");
        _recipient = newRecipient;
    }

    function setRoyaltiesRecipient(address newRecipient) external onlyRole(ADMIN_ROLE) {
        _setRoyaltiesRecipient(newRecipient);
    }

    function _setRoyaltiesPercetange(uint256 newPercentage) internal {
        require(newPercentage >= 0, "Royalties: new percentage is below 0");
        _royaltyPercetange = newPercentage;
    }

    function setRoyaltiesPercentage(uint256 newPercentage) external onlyRole(ADMIN_ROLE) {
        _setRoyaltiesPercetange(newPercentage);
    }

    // EIP2981 standard royalties return.
    function royaltyInfo(uint256, uint256 _salePrice) external view override
        returns (address receiver, uint256 royaltyAmount)
    {
        return (_recipient, (_salePrice * _royaltyPercetange) / 10000);
    }

    // The following functions are overrides required by Solidity.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl, IERC165)
        returns (bool)
    {
        return (interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId));
    }
}
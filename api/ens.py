# ENS subnames + text records (ENS prize — account/receipt layer).
# Server signer owns the wrapped parent (chatterethglobal.eth on mainnet); mints
# <handle>.chatterethglobal.eth for paying users, writes com.chatter.* text records,
# then transfers wrapped ownership after the research brief is published.

from __future__ import annotations

import json
import os
import re
from typing import Any

from eth_account import Account
from web3 import Web3
from web3.contract import Contract

ENS_REGISTRY = Web3.to_checksum_address("0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e")
NAME_WRAPPER = Web3.to_checksum_address("0xD4416B13f2bA7b2dF819a6aEB35D78AbA0d3C233")
PUBLIC_RESOLVER = Web3.to_checksum_address("0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63")
MAX_UINT64 = 2**64 - 1
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

ENS_REGISTRY_ABI = [
    {
        "name": "owner",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "node", "type": "bytes32"}],
        "outputs": [{"name": "", "type": "address"}],
    }
]

NAME_WRAPPER_ABI = [
    {
        "name": "ownerOf",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "id", "type": "uint256"}],
        "outputs": [{"name": "", "type": "address"}],
    },
    {
        "name": "setSubnodeRecord",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "parentNode", "type": "bytes32"},
            {"name": "label", "type": "string"},
            {"name": "owner", "type": "address"},
            {"name": "resolver", "type": "address"},
            {"name": "ttl", "type": "uint64"},
            {"name": "fuses", "type": "uint32"},
            {"name": "expiry", "type": "uint64"},
        ],
        "outputs": [{"name": "", "type": "bytes32"}],
    },
    {
        "name": "safeTransferFrom",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "from", "type": "address"},
            {"name": "to", "type": "address"},
            {"name": "id", "type": "uint256"},
            {"name": "amount", "type": "uint256"},
            {"name": "data", "type": "bytes"},
        ],
        "outputs": [],
    },
]

RESOLVER_ABI = [
    {
        "name": "setText",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "node", "type": "bytes32"},
            {"name": "key", "type": "string"},
            {"name": "value", "type": "string"},
        ],
        "outputs": [],
    },
    {
        "name": "text",
        "type": "function",
        "stateMutability": "view",
        "inputs": [
            {"name": "node", "type": "bytes32"},
            {"name": "key", "type": "string"},
        ],
        "outputs": [{"name": "", "type": "string"}],
    },
    {
        "name": "multicall",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [{"name": "data", "type": "bytes[]"}],
        "outputs": [{"name": "results", "type": "bytes[]"}],
    },
]

_w3: Web3 | None = None
_account: Account | None = None


def _parent_name() -> str:
    return os.environ.get("ENS_PARENT_NAME", "chatterethglobal.eth").strip().lower()


def _rpc_url() -> str:
    return os.environ.get(
        "ENS_RPC_URL",
        os.environ.get("ETH_MAINNET_RPC_URL", "https://ethereum-rpc.publicnode.com"),
    )


def _signer_key() -> str:
    key = os.environ.get("ENS_SIGNER_PRIVATE_KEY", "").strip()
    if not key:
        raise RuntimeError(
            "ENS not configured: set ENS_SIGNER_PRIVATE_KEY and fund the signer on mainnet"
        )
    if not key.startswith("0x"):
        key = f"0x{key}"
    return key


def _clients() -> tuple[Web3, Account]:
    global _w3, _account
    if _w3 is None or _account is None:
        _w3 = Web3(Web3.HTTPProvider(_rpc_url()))
        if not _w3.is_connected():
            raise RuntimeError(f"ENS RPC unreachable: {_rpc_url()}")
        if _w3.eth.chain_id != 1:
            raise RuntimeError(
                f"ENS_RPC_URL must be Ethereum mainnet (chain 1), got {_w3.eth.chain_id}"
            )
        _account = Account.from_key(_signer_key())
    return _w3, _account


def namehash(name: str) -> bytes:
    node = b"\x00" * 32
    if name:
        for label in reversed(name.split(".")):
            label_hash = Web3.keccak(text=label)
            node = Web3.keccak(primitive=node + label_hash)
    return node


def handle_for_address(address: str) -> str:
    cleaned = re.sub(r"^0x", "", address.lower())
    if len(cleaned) < 8:
        raise ValueError("wallet address too short for ENS handle")
    return f"u{cleaned[:8]}"


def full_name(label: str) -> str:
    parent = _parent_name()
    if parent.endswith(".eth"):
        return f"{label}.{parent}"
    return f"{label}.{parent}.eth"


def ens_app_url(subname: str) -> str:
    return f"https://app.ens.domains/{subname}"


def _registry_owner(w3: Web3, node: bytes) -> str:
    registry = w3.eth.contract(address=ENS_REGISTRY, abi=ENS_REGISTRY_ABI)
    return registry.functions.owner(node).call()


def _wrapped_owner(w3: Web3, node: bytes) -> str:
    wrapper = w3.eth.contract(address=NAME_WRAPPER, abi=NAME_WRAPPER_ABI)
    return wrapper.functions.ownerOf(int.from_bytes(node, "big")).call()


def _send_tx(w3: Web3, account: Account, tx: dict[str, Any]) -> str:
    tx.setdefault("chainId", w3.eth.chain_id)
    if "gas" not in tx or tx["gas"] is None:
        tx["gas"] = int(w3.eth.estimate_gas(tx) * 1.2)
    if "maxFeePerGas" not in tx and "gasPrice" not in tx:
        tx["maxFeePerGas"] = w3.eth.gas_price
        tx["maxPriorityFeePerGas"] = w3.eth.max_priority_fee
    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    if receipt.get("status") != 1:
        raise RuntimeError(f"ENS transaction reverted: {tx_hash.hex()}")
    return tx_hash.hex()


def _resolver(w3: Web3) -> Contract:
    return w3.eth.contract(address=PUBLIC_RESOLVER, abi=RESOLVER_ABI)


def _wrapper(w3: Web3) -> Contract:
    return w3.eth.contract(address=NAME_WRAPPER, abi=NAME_WRAPPER_ABI)


def _encode_set_text(w3: Web3, node: bytes, key: str, value: str) -> bytes:
    encoded = _resolver(w3).encode_abi(
        "setText",
        args=[node, key, value],
    )
    if isinstance(encoded, str):
        return bytes.fromhex(encoded.removeprefix("0x"))
    return encoded


def _build_tx(
    w3: Web3,
    account: Account,
    fn,
    *,
    nonce: int,
    gas: int | None = None,
) -> dict[str, Any]:
    tx = fn.build_transaction(
        {
            "from": account.address,
            "nonce": nonce,
            "chainId": w3.eth.chain_id,
            "gas": gas or 400_000,
        }
    )
    return tx


def read_text(subname: str, key: str) -> str:
    w3, _ = _clients()
    node = namehash(subname)
    return _resolver(w3).functions.text(node, key).call()


def mint_subname(
    owner_address: str,
    *,
    payment_tx_hash: str | None = None,
) -> dict[str, Any]:
    w3, account = _clients()
    owner = Web3.to_checksum_address(owner_address)
    label = handle_for_address(owner)
    subname = full_name(label)
    node = namehash(subname)

    registry_owner = _registry_owner(w3, node)
    tx_hashes: list[str] = []

    if registry_owner != ZERO_ADDRESS:
        wrapped_owner = _wrapped_owner(w3, node)
        if wrapped_owner.lower() not in {owner.lower(), account.address.lower()}:
            raise RuntimeError(
                f"subname {subname} already exists for a different owner ({wrapped_owner})"
            )
        return {
            "subname": subname,
            "label": label,
            "node": "0x" + node.hex(),
            "owner": owner,
            "ensAppUrl": ens_app_url(subname),
            "txHashes": tx_hashes,
            "existing": True,
            "pendingTransfer": wrapped_owner.lower() == account.address.lower(),
        }

    parent_node = namehash(_parent_name())
    wrapper = _wrapper(w3)
    nonce = w3.eth.get_transaction_count(account.address)

    mint_tx = _build_tx(
        w3,
        account,
        wrapper.functions.setSubnodeRecord(
            parent_node,
            label,
            account.address,
            PUBLIC_RESOLVER,
            0,
            0,
            MAX_UINT64,
        ),
        nonce=nonce,
        gas=500_000,
    )
    tx_hashes.append(_send_tx(w3, account, mint_tx))

    records: list[tuple[str, str]] = [
        ("description", "Chatter research receipt — owned by your wallet."),
        ("url", "https://chatter.eth"),
        ("com.chatter.version", "1"),
        (
            "com.chatter.brief",
            json.dumps({"status": "awaiting_research"}, separators=(",", ":")),
        ),
    ]
    if payment_tx_hash:
        records.append(("com.chatter.paymentTx", payment_tx_hash))

    multicall_data = [_encode_set_text(w3, node, key, value) for key, value in records]
    nonce += 1
    records_tx = _build_tx(
        w3,
        account,
        _resolver(w3).functions.multicall(multicall_data),
        nonce=nonce,
        gas=400_000,
    )
    tx_hashes.append(_send_tx(w3, account, records_tx))

    # Transfer deferred until publish_brief (users lack mainnet ETH for setText).
    return {
        "subname": subname,
        "label": label,
        "node": "0x" + node.hex(),
        "owner": owner,
        "ensAppUrl": ens_app_url(subname),
        "txHashes": tx_hashes,
        "existing": False,
        "pendingTransfer": True,
    }


def publish_brief(
    owner_address: str,
    brief: Any,
    *,
    subname: str | None = None,
) -> dict[str, Any]:
    w3, account = _clients()
    owner = Web3.to_checksum_address(owner_address)
    label = handle_for_address(owner)
    resolved_subname = (subname or full_name(label)).strip().lower()
    node = namehash(resolved_subname)
    tx_hashes: list[str] = []

    wrapped_owner = _wrapped_owner(w3, node)
    if wrapped_owner.lower() not in {account.address.lower(), owner.lower()}:
        raise RuntimeError(
            f"cannot publish brief for {resolved_subname}: unexpected owner {wrapped_owner}"
        )

    payload = json.dumps(brief, separators=(",", ":"))
    nonce = w3.eth.get_transaction_count(account.address)

    if wrapped_owner.lower() == account.address.lower():
        brief_tx = _build_tx(
            w3,
            account,
            _resolver(w3).functions.setText(node, "com.chatter.brief", payload),
            nonce=nonce,
            gas=200_000,
        )
        tx_hashes.append(_send_tx(w3, account, brief_tx))
        nonce += 1

        transfer_tx = _build_tx(
            w3,
            account,
            _wrapper(w3).functions.safeTransferFrom(
                account.address,
                owner,
                int.from_bytes(node, "big"),
                1,
                b"",
            ),
            nonce=nonce,
            gas=300_000,
        )
        tx_hashes.append(_send_tx(w3, account, transfer_tx))
        transferred = True
    else:
        transferred = True

    return {
        "subname": resolved_subname,
        "owner": owner,
        "ensAppUrl": ens_app_url(resolved_subname),
        "txHashes": tx_hashes,
        "transferred": transferred,
    }


def read_records(subname: str) -> dict[str, str]:
    keys = [
        "description",
        "com.chatter.brief",
        "com.chatter.paymentTx",
        "com.chatter.version",
    ]
    return {key: read_text(subname, key) for key in keys}

#!/usr/bin/env python3
"""
GRVT Python Service Wrapper
Following NebulaLabs architecture pattern

Communicates with Node.js via JSON over stdin/stdout
Handles GRVT Python SDK operations
"""

import json
import sys
import time
import random
import logging
from typing import Dict, Any

# Monkey-patch requests.Session to fix duplicate cookies issue in GRVT SDK
import requests

_original_cookies_update = requests.cookies.RequestsCookieJar.update

def _patched_cookies_update(self, other=None, **kwargs):
    """Patched update that removes existing 'gravity' cookie before adding new one"""
    if other and isinstance(other, dict) and 'gravity' in other:
        to_remove = [cookie for cookie in self if cookie.name == 'gravity']
        for cookie in to_remove:
            self.clear(cookie.domain, cookie.path, cookie.name)
    elif 'gravity' in kwargs:
        to_remove = [cookie for cookie in self if cookie.name == 'gravity']
        for cookie in to_remove:
            self.clear(cookie.domain, cookie.path, cookie.name)
    return _original_cookies_update(self, other, **kwargs)

requests.cookies.RequestsCookieJar.update = _patched_cookies_update

try:
    from pysdk.grvt_raw_sync import GrvtRawSync
    from pysdk.grvt_raw_base import GrvtApiConfig, GrvtError
    from pysdk.grvt_raw_env import GrvtEnv
    from pysdk.grvt_raw_signing import sign_order, sign_transfer
    from pysdk import grvt_raw_types as types
    from pysdk import grvt_fixed_types as fixed_types
    from eth_account import Account
except ImportError as e:
    print(json.dumps({'error': f'Failed to import GRVT SDK: {str(e)}'}), file=sys.stderr)
    sys.exit(1)


class GrvtService:
    """Wrapper for GRVT Python SDK"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        # Support both account_id and trading_account_id for backward compatibility
        if 'trading_account_id' in config and 'account_id' not in config:
            config['account_id'] = config['trading_account_id']
        # Support both api_key and trading_api_key
        if 'trading_api_key' in config and 'api_key' not in config:
            config['api_key'] = config['trading_api_key']
        # Support both private_key and trading_private_key
        if 'trading_private_key' in config and 'private_key' not in config:
            config['private_key'] = config['trading_private_key']
        self.api = None
        self._initialize()
    
    def _initialize(self):
        """Initialize GRVT API"""
        try:
            # Setup logger
            logger = logging.getLogger('grvt')
            logger.setLevel(logging.WARNING)  # Reduce noise
            handler = logging.StreamHandler(sys.stderr)
            handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
            logger.addHandler(handler)
            
            # Map parameters from Node.js naming to service naming
            # Node.js sends: trading_account_id, trading_private_key, trading_api_key
            # Service uses: account_id, private_key, api_key
            self.account_id = self.config.get('trading_account_id') or self.config.get('account_id')
            self.private_key = self.config.get('trading_private_key') or self.config.get('private_key')
            self.api_key = self.config.get('trading_api_key') or self.config.get('api_key')
            self.funding_address = self.config.get('funding_address')
            self.funding_private_key = self.config.get('funding_private_key')
            self.funding_api_key = self.config.get('funding_api_key')
            
            if not self.account_id or not self.private_key or not self.api_key:
                raise Exception('Missing required credentials: account_id, private_key, api_key')
            
            # Create eth_account for signing transfers (use funding private key)
            self.account = Account.from_key(self.funding_private_key or self.private_key)
            
            # Determine environment
            env_str = self.config.get('environment', 'testnet').lower()
            if env_str == 'mainnet':
                self.env = GrvtEnv.PROD
            elif env_str == 'staging':
                self.env = GrvtEnv.STAGING
            else:
                self.env = GrvtEnv.TESTNET
            
            # Create API config
            api_config = GrvtApiConfig(
                env=self.env,
                trading_account_id=self.account_id,
                private_key=self.private_key,
                api_key=self.api_key,
                logger=logger
            )
            
            # Initialize API
            self.api = GrvtRawSync(config=api_config)
            
        except Exception as e:
            raise Exception(f'Failed to initialize GRVT API: {str(e)}')
    
    def get_account_info(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get account information"""
        try:
            resp = self.api.account_summary_v1(
                types.ApiSubAccountSummaryRequest(
                    sub_account_id=self.account_id
                )
            )
            
            if isinstance(resp, GrvtError):
                return {'error': str(resp)}
            
            result = resp.result if hasattr(resp, 'result') else resp
            
            return {
                'available_for_trade': str(result.available_balance if hasattr(result, 'available_balance') else '0'),
                'available_for_withdrawal': str(result.available_balance if hasattr(result, 'available_balance') else '0'),
                'unrealised_pnl': str(result.total_unrealised_pnl if hasattr(result, 'total_unrealised_pnl') else '0'),
                'realised_pnl': str(result.total_realised_pnl if hasattr(result, 'total_realised_pnl') else '0'),
                'total_balance': str(result.total_balance if hasattr(result, 'total_balance') else '0')
            }
        except Exception as e:
            return {'error': str(e)}
    
    def get_markets(self, params: Dict[str, Any]) -> Any:
        """Get all markets"""
        try:
            resp = self.api.get_all_instruments_v1(
                types.ApiGetAllInstrumentsRequest(is_active=True)
            )
            
            if isinstance(resp, GrvtError):
                return {'error': str(resp)}
            
            instruments = resp.result if hasattr(resp, 'result') else resp
            
            markets = []
            for inst in instruments:
                market = {
                    'name': inst.instrument if hasattr(inst, 'instrument') else '',
                    'instrument': inst.instrument if hasattr(inst, 'instrument') else '',
                    'active': True,
                    'market_stats': {
                        'ask_price': str(inst.ask_price if hasattr(inst, 'ask_price') else '0'),
                        'bid_price': str(inst.bid_price if hasattr(inst, 'bid_price') else '0'),
                        'funding_rate': str(inst.funding_rate if hasattr(inst, 'funding_rate') else '0'),
                        'open_interest': str(inst.open_interest if hasattr(inst, 'open_interest') else '0')
                    },
                    'trading_config': {
                        'min_order_size': str(inst.min_size if hasattr(inst, 'min_size') else '0.001'),
                        'min_order_size_change': str(inst.size_step if hasattr(inst, 'size_step') else '0.001'),
                        'min_price_change': str(inst.price_step if hasattr(inst, 'price_step') else '0.01'),
                        'max_market_order_value': str(inst.max_market_order if hasattr(inst, 'max_market_order') else '1000000'),
                        'max_limit_order_value': str(inst.max_limit_order if hasattr(inst, 'max_limit_order') else '1000000')
                    }
                }
                markets.append(market)
            
            return markets
        except Exception as e:
            return {'error': str(e)}
    
    def get_positions(self, params: Dict[str, Any]) -> Any:
        """Get all positions"""
        try:
            resp = self.api.positions_v1(
                types.ApiPositionsRequest(sub_account_id=self.account_id)
            )
            
            if isinstance(resp, GrvtError):
                return {'error': str(resp)}
            
            positions_data = resp.result if hasattr(resp, 'result') else resp
            
            positions = []
            for pos in positions_data:
                size = float(pos.size if hasattr(pos, 'size') else 0)
                mark_price = float(pos.mark_price if hasattr(pos, 'mark_price') else 0)
                
                position = {
                    'market': pos.instrument if hasattr(pos, 'instrument') else '',
                    'instrument': pos.instrument if hasattr(pos, 'instrument') else '',
                    'side': 'long' if size > 0 else 'short',
                    'size': str(size),
                    'open_price': str(pos.entry_price if hasattr(pos, 'entry_price') else 0),
                    'entry_price': str(pos.entry_price if hasattr(pos, 'entry_price') else 0),
                    'mark_price': str(mark_price),
                    'liquidation_price': str(pos.liquidation_price if hasattr(pos, 'liquidation_price') else 0),
                    'unrealised_pnl': str(pos.unrealised_pnl if hasattr(pos, 'unrealised_pnl') else 0),
                    'realised_pnl': str(pos.realised_pnl if hasattr(pos, 'realised_pnl') else 0),
                    'value': str(abs(size * mark_price)),
                    'last_order_id': pos.last_order_id if hasattr(pos, 'last_order_id') else '',
                    'last_order_status': pos.last_order_status if hasattr(pos, 'last_order_status') else ''
                }
                positions.append(position)
            
            return positions
        except Exception as e:
            return {'error': str(e)}
    
    def place_order(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Place order"""
        try:
            # Generate unique IDs
            nonce = random.randint(0, 2**32 - 1)
            client_order_id = str(random.randint(0, 2**32 - 1))
            
            # Calculate expiration (20 days in nanoseconds)
            expiration = str(int(time.time_ns()) + 20 * 24 * 60 * 60 * 1_000_000_000)
            
            # Determine order parameters
            is_market = params.get('order_type', 'LIMIT') == 'MARKET'
            time_in_force = types.TimeInForce.IMMEDIATE_OR_CANCEL if is_market else types.TimeInForce.GOOD_TILL_TIME
            
            # Build order leg - MARKET orders should NOT have limit_price
            order_leg = types.OrderLeg(
                instrument=params['market_name'],
                size=params['amount'],
                limit_price=params.get('price', '0'),  # Use '0' for MARKET orders
                is_buying_asset=params['side'] == 'BUY'
            )
            
            # Build order
            order = types.Order(
                sub_account_id=self.account_id,
                time_in_force=time_in_force,
                is_market=is_market,
                post_only=params.get('post_only', False),
                reduce_only=params.get('reduce_only', False),
                legs=[order_leg],
                signature=types.Signature(
                    signer='',
                    r='',
                    s='',
                    v=0,
                    expiration=expiration,
                    nonce=nonce
                ),
                metadata=types.OrderMetadata(
                    client_order_id=client_order_id
                )
            )
            
            # Get instruments for signing
            inst_resp = self.api.get_all_instruments_v1(
                types.ApiGetAllInstrumentsRequest(is_active=True)
            )
            
            if isinstance(inst_resp, GrvtError):
                return {'error': f'Failed to get instruments: {str(inst_resp)}'}
            
            instruments_data = inst_resp.result if hasattr(inst_resp, 'result') else inst_resp
            instruments = {inst.instrument: inst for inst in instruments_data}
            
            # Sign order using api.config and api.account (not self.config dict)
            signed_order = sign_order(order, self.api.config, self.api.account, instruments)
            
            # Submit order
            resp = self.api.create_order_v1(types.ApiCreateOrderRequest(order=signed_order))
            
            if isinstance(resp, GrvtError):
                return {'error': str(resp)}
            
            # The response contains the created Order object with order_id filled by GRVT backend
            result = resp.result if hasattr(resp, 'result') else resp
            
            # Extract order_id - GRVT may return '0x00' initially, so we use client_order_id in that case
            order_id = getattr(result, 'order_id', None)
            
            # Use client_order_id if order_id is empty, None, or '0x00'
            if not order_id or order_id == '0x00':
                final_order_id = client_order_id
            else:
                final_order_id = order_id
            
            return {
                'external_id': final_order_id,
                'order_id': final_order_id,
                'client_order_id': client_order_id,
                'grvt_order_id': order_id,  # Keep the original for reference
                'status': result.state.status.name if hasattr(result, 'state') and hasattr(result.state, 'status') else 'NEW'
            }
        except Exception as e:
            return {'error': str(e)}
    
    def cancel_order_by_external_id(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Cancel order by external ID (can be order_id or client_order_id)"""
        try:
            external_id = params.get('external_id')
            
            # Build cancel request - GRVT accepts either order_id or client_order_id
            # Since we're using client_order_id as external_id, pass it as client_order_id
            cancel_request = types.ApiCancelOrderRequest(
                sub_account_id=self.account_id
            )
            
            # If external_id looks like a number (client_order_id), use client_order_id field
            # Otherwise, use order_id field
            try:
                # Try to parse as int - if successful, it's likely a client_order_id
                int(external_id)
                cancel_request.client_order_id = str(external_id)
            except (ValueError, TypeError):
                # Otherwise treat it as order_id
                cancel_request.order_id = str(external_id)
            
            resp = self.api.cancel_order_v1(cancel_request)
            
            if isinstance(resp, GrvtError):
                return {'error': str(resp)}
            
            return {'success': True}
        except Exception as e:
            return {'error': str(e)}
    
    def cancel_all_orders(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Cancel all orders"""
        try:
            request_params = {'sub_account_id': self.account_id}
            
            if params.get('instrument'):
                request_params['instrument'] = params['instrument']
            
            resp = self.api.cancel_all_orders_v1(
                types.ApiCancelAllOrdersRequest(**request_params)
            )
            
            if isinstance(resp, GrvtError):
                return {'error': str(resp)}
            
            result = resp.result if hasattr(resp, 'result') else resp
            
            return {
                'success': True,
                'cancelled_count': len(result) if isinstance(result, list) else 0
            }
        except Exception as e:
            return {'error': str(e)}
    
    def transfer(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Transfer between funding and trading accounts using funding account credentials"""
        try:
            # Get funding credentials from params (passed from Node.js wmTransferToTrading/wmTransferToFunding)
            funding_address = params.get('funding_address') or self.funding_address
            funding_private_key = params.get('funding_private_key') or self.funding_private_key
            funding_api_key = params.get('funding_api_key') or self.funding_api_key
            trading_account_id = params.get('trading_account_id') or self.account_id
            
            if not funding_address:
                return {'error': 'Funding address is required'}
            if not funding_private_key:
                return {'error': 'Funding private key is required'}
            if not funding_api_key:
                return {'error': 'Funding API key is required'}
            
            # Create account from funding private key for signing
            funding_account = Account.from_key(funding_private_key)
            
            # Determine direction: to_trading or to_funding
            direction = params.get('direction', 'to_trading')
            amount = str(params['amount'])
            currency = params.get('currency', 'USDC')
            
            # Get currency ID (3 for USDT, 4 for USDC)
            currency_id = 4 if currency == 'USDC' else 3  # USDT = 3, USDC = 4
            
            # IMPORTANT: from_account_id and to_account_id are ALWAYS the same (funding address/main_account_id)
            # We transfer between sub-accounts using sub_account_id
            # The funding_address IS the main_account_id
            main_account_id = funding_address
            
            if direction == 'to_trading':
                from_sub = '0'  # Funding account (main account, sub_account_id = 0)
                to_sub = str(trading_account_id)  # Trading account (sub)
            else:  # to_funding
                from_sub = str(trading_account_id)  # Trading account (sub)
                to_sub = '0'  # Funding account (main account, sub_account_id = 0)
            
            # Generate unique nonce and expiration
            nonce = random.randint(0, 2**32 - 1)
            expiration = str(int(time.time_ns()) + 20 * 24 * 60 * 60 * 1_000_000_000)  # 20 days
            
            # Create transfer object (following official SDK pattern from test_raw_utils.py)
            transfer = fixed_types.Transfer(
                from_account_id=main_account_id,
                from_sub_account_id=from_sub,
                to_account_id=main_account_id,  # SAME as from_account_id for internal transfers!
                to_sub_account_id=to_sub,
                currency=currency,
                num_tokens=amount,
                signature=types.Signature(
                    signer='',
                    r='',
                    s='',
                    v=0,
                    expiration=expiration,
                    nonce=nonce
                ),
                transfer_type=types.TransferType.STANDARD,
                transfer_metadata=''
            )
            
            # Create API config with FUNDING credentials
            # IMPORTANT: For transfers, we need to authenticate with funding API key
            # The SDK uses trading_account_id for the X-Grvt-Account-Id header
            # For funding account, we should use the trading sub-account ID that was created
            funding_api_config = GrvtApiConfig(
                env=self.env,
                trading_account_id=str(trading_account_id),  # Use trading sub-account ID for auth
                private_key=funding_private_key,  # Funding private key for signing
                api_key=funding_api_key,  # Funding API key for authentication
                logger=logging.getLogger('grvt')
            )
            
            # Sign the transfer with funding account
            signed_transfer = sign_transfer(
                transfer, 
                funding_api_config, 
                funding_account,  # Use the funding account for signing
                currencyId=currency_id
            )
            
            # Create API instance with funding credentials for executing transfer
            # Use a fresh instance to avoid cookie conflicts
            funding_api = GrvtRawSync(config=funding_api_config)
            
            # Clear any existing cookies to avoid "multiple cookies" error
            if hasattr(funding_api, '_session') and hasattr(funding_api._session, 'cookies'):
                funding_api._session.cookies.clear()
            
            # Create API request
            transfer_request = types.ApiTransferRequest(
                from_account_id=signed_transfer.from_account_id,
                from_sub_account_id=signed_transfer.from_sub_account_id,
                to_account_id=signed_transfer.to_account_id,
                to_sub_account_id=signed_transfer.to_sub_account_id,
                currency=signed_transfer.currency,
                num_tokens=signed_transfer.num_tokens,
                signature=signed_transfer.signature,
                transfer_type=signed_transfer.transfer_type,
                transfer_metadata=signed_transfer.transfer_metadata
            )
            
            # Execute transfer using funding API instance
            resp = funding_api.transfer_v1(transfer_request)
            
            if isinstance(resp, GrvtError):
                return {'error': str(resp)}
            
            result = resp.result if hasattr(resp, 'result') else resp
            
            return {
                'success': True,
                'tx_id': result.tx_id if hasattr(result, 'tx_id') else '',
                'ack': result.ack if hasattr(result, 'ack') else True,
                'direction': direction,
                'amount': amount,
                'currency': currency,
                'from_account': main_account_id,
                'from_sub_account': from_sub,
                'to_sub_account': to_sub
            }
        except Exception as e:
            import traceback
            return {'error': str(e), 'traceback': traceback.format_exc()}
    
    def transfer_history(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get transfer history"""
        try:
            request_params = {
                'sub_account_id': self.account_id
            }
            
            if params.get('limit'):
                request_params['limit'] = params['limit']
            
            if params.get('cursor'):
                request_params['cursor'] = params['cursor']
            
            resp = self.api.transfer_history_v1(
                types.ApiTransferHistoryRequest(**request_params)
            )
            
            if isinstance(resp, GrvtError):
                return {'error': str(resp)}
            
            result = resp.result if hasattr(resp, 'result') else resp
            
            transfers = []
            for transfer in result:
                transfers.append({
                    'tx_id': transfer.tx_id if hasattr(transfer, 'tx_id') else '',
                    'from_account': transfer.from_account_id if hasattr(transfer, 'from_account_id') else '',
                    'from_sub_account': transfer.from_sub_account_id if hasattr(transfer, 'from_sub_account_id') else '',
                    'to_account': transfer.to_account_id if hasattr(transfer, 'to_account_id') else '',
                    'to_sub_account': transfer.to_sub_account_id if hasattr(transfer, 'to_sub_account_id') else '',
                    'currency': transfer.currency if hasattr(transfer, 'currency') else '',
                    'amount': transfer.num_tokens if hasattr(transfer, 'num_tokens') else '',
                    'timestamp': transfer.event_time if hasattr(transfer, 'event_time') else '',
                    'type': transfer.transfer_type.name if hasattr(transfer, 'transfer_type') else ''
                })
            
            return {
                'transfers': transfers,
                'next': resp.next if hasattr(resp, 'next') else ''
            }
        except Exception as e:
            return {'error': str(e)}
    
    def withdraw(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Submit withdrawal"""
        try:
            chain_id = params.get('chain_id', 'STRK')
            if chain_id == 'ETH':
                chain_id = 'ETHEREUM'
            elif chain_id == 'STRK':
                chain_id = 'STARKNET'
            
            withdrawal_params = {
                'from_account_id': self.config.get('account_id'),
                'from_sub_account_id': '0',
                'currency': params.get('currency', 'USDC'),
                'num_tokens': params['amount'],
                'chain_id': chain_id
            }
            
            if params.get('stark_address'):
                withdrawal_params['stark_address'] = params['stark_address']
            
            resp = self.api.withdrawal_v1(
                types.ApiWithdrawalRequest(**withdrawal_params)
            )
            
            if isinstance(resp, GrvtError):
                return {'error': str(resp)}
            
            result = resp.result if hasattr(resp, 'result') else resp
            
            return {
                'withdrawal_id': result.withdrawal_id if hasattr(result, 'withdrawal_id') else ''
            }
        except Exception as e:
            return {'error': str(e)}
    
    def get_order_history(self, params: Dict[str, Any]) -> Any:
        """Get order history"""
        try:
            request_params = {
                'sub_account_id': self.account_id,
                'limit': params.get('limit', 50)
            }
            
            if params.get('instrument'):
                request_params['instrument'] = params['instrument']
            
            resp = self.api.order_history_v1(
                types.ApiOrderHistoryRequest(**request_params)
            )
            
            if isinstance(resp, GrvtError):
                return {'error': str(resp)}
            
            orders = resp.result if hasattr(resp, 'result') else resp
            
            return orders if isinstance(orders, list) else []
        except Exception as e:
            return {'error': str(e)}
    
    def vault_invest(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Invest in a vault with automatic EIP712 signing"""
        try:
            from eth_account.messages import encode_typed_data
            
            # Get funding credentials from params (passed from Node.js)
            funding_address = params.get('funding_address') or self.funding_address
            funding_private_key = params.get('funding_private_key') or self.funding_private_key
            funding_api_key = params.get('funding_api_key') or self.funding_api_key
            trading_account_id = params.get('trading_account_id') or self.account_id
            
            if not funding_address:
                return {'error': 'Funding address is required'}
            if not funding_private_key:
                return {'error': 'Funding private key is required'}
            if not funding_api_key:
                return {'error': 'Funding API key is required'}
            
            # Create account from funding private key for signing
            funding_account = Account.from_key(funding_private_key)
            
            # Extract parameters
            vault_id = params['vault_id']
            amount = str(params['amount'])
            currency = params.get('currency', 'USDC')
            
            # Get currency ID (3 for USDT, 4 for USDC)
            currency_id = 4 if currency == 'USDC' else 3
            
            # Generate unique nonce and expiration (20 days)
            nonce = random.randint(0, 2**32 - 1)
            expiration_ns = int(time.time_ns()) + 20 * 24 * 60 * 60 * 1_000_000_000
            
            # Build EIP712 message data for vault invest
            # Following the pattern of transfer but with vault-specific fields
            message_data = {
                "mainAccountID": funding_address,
                "vaultID": int(vault_id),
                "tokenCurrency": currency_id,
                "numTokens": int(float(amount) * 1_000_000),  # Convert to micro units (6 decimals)
                "nonce": nonce,
                "expiration": expiration_ns
            }
            
            # Define EIP712 domain
            chain_id = 326 if self.env == GrvtEnv.TESTNET else 1  # 326 for testnet, 1 for mainnet
            domain_data = {
                "name": "GRVT Exchange",
                "version": "0",
                "chainId": chain_id
            }
            
            # Define EIP712 message type for vault invest
            message_type = {
                "VaultInvest": [
                    {"name": "mainAccountID", "type": "address"},
                    {"name": "vaultID", "type": "uint64"},
                    {"name": "tokenCurrency", "type": "uint8"},
                    {"name": "numTokens", "type": "uint64"},
                    {"name": "nonce", "type": "uint32"},
                    {"name": "expiration", "type": "int64"}
                ]
            }
            
            # Encode and sign the typed data using funding account
            signable_message = encode_typed_data(domain_data, message_type, message_data)
            signed_message = funding_account.sign_message(signable_message)
            
            # Create signature object
            signature = types.Signature(
                signer=str(funding_account.address),
                r="0x" + signed_message.r.to_bytes(32, byteorder="big").hex(),
                s="0x" + signed_message.s.to_bytes(32, byteorder="big").hex(),
                v=signed_message.v,
                expiration=str(expiration_ns),
                nonce=nonce
            )
            
            # Create API request with signature
            invest_request = types.ApiVaultInvestRequest(
                main_account_id=funding_address,
                vault_id=vault_id,
                currency=currency,
                num_tokens=amount,
                signature=signature
            )
            
            # Use funding API instance for vault operations
            api_config = GrvtApiConfig(
                env=self.env,
                trading_account_id=trading_account_id,
                private_key=funding_private_key,
                api_key=funding_api_key,
                logger=logging.getLogger('grvt')
            )
            funding_api = GrvtRawSync(config=api_config)
            
            # Execute vault invest
            resp = funding_api.vault_invest_v1(invest_request)
            
            if isinstance(resp, GrvtError):
                return {'error': str(resp)}
            
            result = resp.result if hasattr(resp, 'result') else resp
            
            return {
                'success': True,
                'ack': result.ack if hasattr(result, 'ack') else True,
                'vault_id': vault_id,
                'amount': amount,
                'currency': currency
            }
        except Exception as e:
            return {'error': str(e)}
    
    def vault_redeem(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Redeem from a vault with automatic EIP712 signing"""
        try:
            from eth_account.messages import encode_typed_data
            
            # Get funding credentials from params (passed from Node.js)
            funding_address = params.get('funding_address') or self.funding_address
            funding_private_key = params.get('funding_private_key') or self.funding_private_key
            funding_api_key = params.get('funding_api_key') or self.funding_api_key
            trading_account_id = params.get('trading_account_id') or self.account_id
            
            if not funding_address:
                return {'error': 'Funding address is required'}
            if not funding_private_key:
                return {'error': 'Funding private key is required'}
            if not funding_api_key:
                return {'error': 'Funding API key is required'}
            
            # Create account from funding private key for signing
            funding_account = Account.from_key(funding_private_key)
            
            # Extract parameters
            vault_id = params['vault_id']
            amount = str(params['amount'])  # LP tokens amount
            currency = params.get('currency', 'USDC')
            
            # Get currency ID (3 for USDT, 4 for USDC)
            currency_id = 4 if currency == 'USDC' else 3
            
            # Generate unique nonce and expiration (20 days)
            nonce = random.randint(0, 2**32 - 1)
            expiration_ns = int(time.time_ns()) + 20 * 24 * 60 * 60 * 1_000_000_000
            
            # Build EIP712 message data for vault redeem
            message_data = {
                "mainAccountID": funding_address,
                "vaultID": int(vault_id),
                "tokenCurrency": currency_id,
                "numTokens": int(float(amount) * 1_000_000),  # Convert to micro units (6 decimals)
                "nonce": nonce,
                "expiration": expiration_ns
            }
            
            # Define EIP712 domain
            chain_id = 326 if self.env == GrvtEnv.TESTNET else 1
            domain_data = {
                "name": "GRVT Exchange",
                "version": "0",
                "chainId": chain_id
            }
            
            # Define EIP712 message type for vault redeem
            message_type = {
                "VaultRedeem": [
                    {"name": "mainAccountID", "type": "address"},
                    {"name": "vaultID", "type": "uint64"},
                    {"name": "tokenCurrency", "type": "uint8"},
                    {"name": "numTokens", "type": "uint64"},
                    {"name": "nonce", "type": "uint32"},
                    {"name": "expiration", "type": "int64"}
                ]
            }
            
            # Encode and sign the typed data using funding account
            signable_message = encode_typed_data(domain_data, message_type, message_data)
            signed_message = funding_account.sign_message(signable_message)
            
            # Create signature object
            signature = types.Signature(
                signer=str(funding_account.address),
                r="0x" + signed_message.r.to_bytes(32, byteorder="big").hex(),
                s="0x" + signed_message.s.to_bytes(32, byteorder="big").hex(),
                v=signed_message.v,
                expiration=str(expiration_ns),
                nonce=nonce
            )
            
            # Create API request with signature
            redeem_request = types.ApiVaultRedeemRequest(
                main_account_id=funding_address,
                vault_id=vault_id,
                currency=currency,
                num_tokens=amount,
                signature=signature
            )
            
            # Use funding API instance for vault operations
            api_config = GrvtApiConfig(
                env=self.env,
                trading_account_id=trading_account_id,
                private_key=funding_private_key,
                api_key=funding_api_key,
                logger=logging.getLogger('grvt')
            )
            funding_api = GrvtRawSync(config=api_config)
            
            # Execute vault redeem
            resp = funding_api.vault_redeem_v1(redeem_request)
            
            if isinstance(resp, GrvtError):
                return {'error': str(resp)}
            
            result = resp.result if hasattr(resp, 'result') else resp
            
            return {
                'success': True,
                'ack': result.ack if hasattr(result, 'ack') else True,
                'vault_id': vault_id,
                'amount': amount,
                'currency': currency
            }
        except Exception as e:
            return {'error': str(e)}


# Main service loop
if __name__ == '__main__':
    service = None
    
    # Read commands from stdin
    for line in sys.stdin:
        try:
            request = json.loads(line.strip())
            command = request.get('command')
            params = request.get('params', {})
            
            # Initialize service on first command
            if not service:
                service = GrvtService(params)
            
            # Execute command
            if hasattr(service, command):
                result = getattr(service, command)(params)
            else:
                result = {'error': f'Unknown command: {command}'}
            
            # Send result
            sys.stdout.write(json.dumps({'data': result}) + '\n')
            sys.stdout.flush()
        
        except Exception as e:
            sys.stdout.write(json.dumps({'error': str(e)}) + '\n')
            sys.stdout.flush()

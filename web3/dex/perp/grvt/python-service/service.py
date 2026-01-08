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

try:
    from pysdk.grvt_raw_sync import GrvtRawSync
    from pysdk.grvt_raw_base import GrvtApiConfig, GrvtError
    from pysdk.grvt_raw_env import GrvtEnv
    from pysdk.grvt_raw_signing import sign_order
    from pysdk import grvt_raw_types as types
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
            
            if not self.account_id or not self.private_key or not self.api_key:
                raise Exception('Missing required credentials: account_id, private_key, api_key')
            
            # Determine environment
            env_str = self.config.get('environment', 'testnet').lower()
            if env_str == 'mainnet':
                env = GrvtEnv.PROD
            elif env_str == 'staging':
                env = GrvtEnv.STAGING
            else:
                env = GrvtEnv.TESTNET
            
            # Create API config
            api_config = GrvtApiConfig(
                env=env,
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
            
            # Build order leg
            order_leg = types.OrderLeg(
                instrument=params['market_name'],
                size=params['amount'],
                limit_price=params['price'],
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
            
            result = resp.result if hasattr(resp, 'result') else resp
            
            return {
                'external_id': result.order_id if hasattr(result, 'order_id') else client_order_id,
                'order_id': result.order_id if hasattr(result, 'order_id') else client_order_id,
                'status': result.state.status.name if hasattr(result, 'state') and hasattr(result.state, 'status') else 'NEW'
            }
        except Exception as e:
            return {'error': str(e)}
    
    def cancel_order_by_external_id(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Cancel order by external ID"""
        try:
            resp = self.api.cancel_order_v1(
                types.ApiCancelOrderRequest(
                    sub_account_id=self.account_id,
                    order_id=params['external_id']
                )
            )
            
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
        """Transfer between funding and trading accounts"""
        try:
            # Determine direction: to_trading or to_funding
            direction = params.get('direction', 'to_trading')
            
            if direction == 'to_trading':
                from_sub = '0'  # Funding account
                to_sub = self.account_id  # Trading account
            else:  # to_funding
                from_sub = self.account_id  # Trading account
                to_sub = '0'  # Funding account
            
            transfer_request = types.ApiTransferRequest(
                from_account_id=self.config.get('funding_address', self.config.get('trading_address')),
                from_sub_account_id=from_sub,
                to_account_id=self.config.get('trading_address'),
                to_sub_account_id=to_sub,
                currency=params.get('currency', 'USDC'),
                num_tokens=params['amount'],
                signature=types.Signature(
                    signer='',
                    r='',
                    s='',
                    v=0,
                    expiration='',
                    nonce=0
                ),
                transfer_type=types.TransferType.STANDARD,
                transfer_metadata=''
            )
            
            resp = self.api.transfer_v1(transfer_request)
            
            if isinstance(resp, GrvtError):
                return {'error': str(resp)}
            
            result = resp.result if hasattr(resp, 'result') else resp
            
            return {
                'success': True,
                'tx_id': result.tx_id if hasattr(result, 'tx_id') else '',
                'direction': direction,
                'amount': params['amount']
            }
        except Exception as e:
            return {'error': str(e)}
    
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

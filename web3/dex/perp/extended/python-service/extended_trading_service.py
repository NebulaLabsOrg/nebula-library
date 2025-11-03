"""
Extended Trading Service - Complete Python wrapper for x10-python-trading-starknet SDK
Uses ALL SDK functions directly for trading, positions, orders, etc.
"""

import json
import sys
import asyncio
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

# X10 SDK imports - COMPLETE SDK
# Try to import Python SDK, if not available use mock
try:
    from x10.perpetual.accounts import StarkPerpetualAccount
    from x10.perpetual.configuration import TESTNET_CONFIG, MAINNET_CONFIG
    from x10.perpetual.order_object import create_order_object
    from x10.perpetual.orders import OrderSide, OrderType
    from x10.perpetual.markets import MarketModel
    from x10.perpetual.assets import Asset
    from x10.perpetual.fees import TradingFeeModel, DEFAULT_FEES
    from x10.perpetual.trading_client import PerpetualTradingClient
    from x10.utils.date import utc_now
    from fast_stark_crypto import get_public_key
    SDK_AVAILABLE = True
except ImportError as e:
    print(f"Warning: x10 SDK not available: {e}", file=sys.stderr)
    SDK_AVAILABLE = False


class ExtendedTradingService:
    """Complete service that uses Python SDK DIRECTLY for ALL operations"""
    
    def __init__(self, api_key: str, private_key: str, public_key: str, vault: int, environment: str = "testnet"):
        self.api_key = api_key
        self.vault = vault
        self.private_key = private_key
        self.public_key = public_key
        self.environment = environment
        
        if not SDK_AVAILABLE:
            print("Warning: Running in mock mode - install x10-python-trading-starknet for full functionality", file=sys.stderr)
            self.trading_client = None
            self.data_client = None
            return
            
        try:
            # Configure environment
            self.config = TESTNET_CONFIG if environment == "testnet" else MAINNET_CONFIG
            
            # Create StarkNet account
            self.stark_account = StarkPerpetualAccount(
                vault=vault,
                private_key=private_key,
                public_key=public_key,
                api_key=api_key
            )
            
            # Initialize clients
            self._initialize_clients()
            
        except Exception as e:
            print(f"Error in initialization: {str(e)}", file=sys.stderr)
            self.trading_client = None
            self.data_client = None
        
    def _initialize_clients(self):
        """Initialize trading and data clients"""
        if not SDK_AVAILABLE:
            return
            
        try:
            # Import here to avoid circular dependencies
            from x10.perpetual.trading_client import PerpetualTradingClient
            
            # Initialize trading client with correct parameters
            self.trading_client = PerpetualTradingClient(
                endpoint_config=self.config,
                stark_account=self.stark_account
            )
            
            # Use trading client for data operations too
            self.data_client = self.trading_client
            
        except Exception as e:
            print(f"Warning: Could not initialize clients: {e}", file=sys.stderr)
            self.trading_client = None
            self.data_client = None
        
    async def get_markets(self) -> List[Dict[str, Any]]:
        """Get all available markets from SDK - Returns ONLY raw data"""
        if not SDK_AVAILABLE:
            return {"error": "X10 SDK not available - install x10-python-trading-starknet"}
        
        if not self.data_client:
            return {"error": "Data client not initialized - check API credentials"}
            
        try:
            # Use markets_info module from trading client according to documentation
            markets_response = await self.data_client.markets_info.get_markets()
            markets = markets_response.data if hasattr(markets_response, 'data') else markets_response
            
            # Return ONLY raw data without any wrapper
            return [self._serialize_object(market) for market in markets]
        except Exception as e:
            return {"error": f"Failed to get markets: {str(e)}"}
    
    def _serialize_object(self, obj):
        """Convert object to JSON-serializable format"""
        if isinstance(obj, Decimal):
            return str(obj)
        elif isinstance(obj, dict):
            return {k: self._serialize_object(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._serialize_object(item) for item in obj]
        elif hasattr(obj, '__dict__'):
            return {k: self._serialize_object(v) for k, v in obj.__dict__.items()}
        elif hasattr(obj, 'to_dict'):
            return self._serialize_object(obj.to_dict())
        else:
            try:
                # Try to convert to string if it's not JSON serializable
                json.dumps(obj)
                return obj
            except (TypeError, ValueError):
                return str(obj)

    async def get_account_info(self) -> Dict[str, Any]:
        """Get account information from SDK - Returns ONLY raw data"""
        if not SDK_AVAILABLE:
            return {"error": "X10 SDK not available - install x10-python-trading-starknet"}
        
        if not self.trading_client:
            return {"error": "Trading client not initialized - check API credentials"}
            
        try:
            # Use account module from trading client
            balance_response = await self.trading_client.account.get_balance()
            
            # The SDK returns a WrappedApiResponse, we need to access the .data attribute
            balance = balance_response.data if hasattr(balance_response, 'data') else balance_response
            
            # Return ONLY raw data without any wrapper
            return self._serialize_object(balance)
        except Exception as e:
            return {"error": f"Failed to get account info: {str(e)}"}

    async def get_positions(self) -> List[Dict[str, Any]]:
        """Get all positions from SDK - Returns ONLY raw data"""
        if not SDK_AVAILABLE or not self.trading_client:
            return {"error": "SDK not available or trading client not initialized"}
            
        try:
            positions_response = await self.trading_client.account.get_positions()
            positions = positions_response.data if hasattr(positions_response, 'data') else positions_response
            
            # Return ONLY raw data without any wrapper
            return [self._serialize_object(pos) for pos in positions]
        except Exception as e:
            return {"error": f"Failed to get positions: {str(e)}"}
    
    async def get_orders(self, market_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get orders from SDK - Returns ONLY raw data"""
        if not SDK_AVAILABLE or not self.trading_client:
            return {"error": "SDK not available or trading client not initialized"}
            
        try:
            orders_response = await self.trading_client.account.get_open_orders(
                market_names=[market_name] if market_name else None
            )
            orders = orders_response.data if hasattr(orders_response, 'data') else orders_response
            
            # Return ONLY raw data without any wrapper
            return [self._serialize_object(order) for order in orders]
        except Exception as e:
            return {"error": f"Failed to get orders: {str(e)}"}
    
    async def get_order_by_id(self, order_id: str) -> Dict[str, Any]:
        """Get a specific order by ID using ONLY real SDK methods - Returns ONLY raw data"""
        if not SDK_AVAILABLE or not self.trading_client:
            return {"error": "SDK not available or trading client not initialized"}
            
        try:
            # ONLY real SDK method: search in open orders
            orders_response = await self.trading_client.account.get_open_orders()
            orders = orders_response.data if hasattr(orders_response, 'data') else orders_response
            
            # Look for the specific order by ID in open orders
            for order in orders:
                if str(order.id) == str(order_id) or str(getattr(order, 'client_order_id', '')) == str(order_id):
                    return self._serialize_object(order)
            
            # If not found in open orders, try to search trades from known markets
            # We can only get trades if we know the market names, so let's try common ones
            try:
                # Get markets using the REAL SDK method
                markets_response = await self.data_client.markets_info.get_markets()
                markets = markets_response.data if hasattr(markets_response, 'data') else markets_response
                
                # Search through recent trades in available markets
                for market in markets:
                    market_name = market.name if hasattr(market, 'name') else market.get('name')
                    if not market_name:
                        continue
                        
                    try:
                        # Use REAL SDK method: get_trades
                        trades_response = await self.data_client.get_trades(market_name, limit=100)
                        trades = trades_response.data if hasattr(trades_response, 'data') else trades_response
                        
                        # Check if any trade matches our order ID
                        for trade in trades:
                            # Check various possible order ID fields in trade data
                            trade_order_ids = [
                                getattr(trade, 'order_id', None),
                                getattr(trade, 'maker_order_id', None), 
                                getattr(trade, 'taker_order_id', None),
                                getattr(trade, 'client_order_id', None)
                            ]
                            
                            for trade_order_id in trade_order_ids:
                                if trade_order_id and str(trade_order_id) == str(order_id):
                                    # Found the order in trades - reconstruct basic order data
                                    return self._serialize_object({
                                        'id': order_id,
                                        'market_name': market_name,
                                        'status': 'FILLED',  # Since it appears in trades
                                        'type': 'UNKNOWN',   # Can't determine from trade
                                        'side': getattr(trade, 'side', 'UNKNOWN'),
                                        'amount': getattr(trade, 'size', 0),
                                        'filled_amount': getattr(trade, 'size', 0),
                                        'price': getattr(trade, 'price', 0),
                                        'average_price': getattr(trade, 'price', 0),
                                        'created_at': getattr(trade, 'timestamp', None)
                                    })
                                    
                    except Exception:
                        # Skip this market if we can't get trades
                        continue
                        
            except Exception:
                # If we can't get markets or trades, just return not found
                pass
            
            return {"error": f"Order with ID {order_id} not found in open orders or available trade history"}
                    
        except Exception as e:
            return {"error": f"Failed to get order by ID: {str(e)}"}
    
    async def place_order(self, market_name: str, side: str, amount: str, price: str, 
                         order_type: str = "LIMIT", time_in_force: str = "GTC", post_only: bool = False, reduce_only: bool = False) -> Dict[str, Any]:
        """Place an order DIRECTLY using the SDK with post_only and reduce_only support - Returns ONLY raw data"""
        if not SDK_AVAILABLE or not self.trading_client:
            return {"error": "SDK not available or client not initialized"}
            
        try:
            # Convert parameters according to official SDK documentation
            order_side = OrderSide.BUY if side.upper() in ["BUY", "LONG"] else OrderSide.SELL
            amount_of_synthetic = Decimal(amount)
            order_price = Decimal(price)
            
            # Convert time_in_force string to TimeInForce enum
            from x10.perpetual.orders import TimeInForce
            tif_mapping = {
                "GTC": TimeInForce.GTT,  # Good Till Time (GTT) is Extended's equivalent of GTC
                "GTT": TimeInForce.GTT,
                "IOC": TimeInForce.IOC,
                "FOK": TimeInForce.FOK
            }
            time_in_force_enum = tif_mapping.get(time_in_force.upper(), TimeInForce.GTT)
            
            # Place order using the official SDK method signature with post_only and reduce_only support
            placed_order_response = await self.trading_client.place_order(
                market_name=market_name,
                amount_of_synthetic=amount_of_synthetic,
                price=order_price,
                side=order_side,
                post_only=post_only,  # ✅ Enable post-only parameter
                reduce_only=reduce_only,  # ✅ Enable reduce-only parameter for close orders
                time_in_force=time_in_force_enum  # ✅ Support proper time in force
            )
            
            placed_order = placed_order_response.data if hasattr(placed_order_response, 'data') else placed_order_response
            
            # Return ONLY raw data without any wrapper
            return self._serialize_object(placed_order)
            
        except Exception as e:
            return {"error": f"Failed to place order: {str(e)}"}
    
    def cancel_order(self, external_id):
        """Cancel an order by external ID using Extended SDK cancel_order_by_external_id method"""
        try:
            print(f"DEBUG: cancel_order called with external_id={external_id}")
            
            async def _cancel_order():
                # Use the cancel_order_by_external_id method from Extended SDK
                result = await self.trading_client.orders.cancel_order_by_external_id(order_external_id=external_id)
                print(f"DEBUG: Successfully called cancel_order_by_external_id")
                return result
            
            # Run the async function
            result = asyncio.run(_cancel_order())
            
            return {
                "success": True,
                "message": "Order cancelled successfully",
                "result": result.to_dict() if hasattr(result, 'to_dict') else str(result)
            }
            
        except Exception as e:
            print(f"DEBUG: Error in cancel_order: {str(e)}")
            return {
                "error": f"Cancel order failed: {str(e)}"
            }

    async def cancel_order_by_external_id(self, external_id):
        """Cancel an order by external ID using Extended SDK cancel_order_by_external_id method"""
        try:
            if not SDK_AVAILABLE or not self.trading_client:
                return {"error": "SDK not available or client not initialized"}
            
            # Use the cancel_order_by_external_id method from Extended SDK directly
            result = await self.trading_client.orders.cancel_order_by_external_id(order_external_id=external_id)
            
            return {
                "success": True,
                "message": "Order cancelled successfully",
                "result": result.to_dict() if hasattr(result, 'to_dict') else str(result)
            }
            
        except Exception as e:
            return {
                "error": f"Cancel order by external ID failed: {str(e)}"
            }
    
    async def cancel_all_orders(self, market_name: Optional[str] = None) -> Dict[str, Any]:
        """Cancel all orders DIRECTLY using the SDK - Returns ONLY raw data"""
        if not SDK_AVAILABLE or not self.trading_client:
            return {"error": "SDK not available or client not initialized"}
            
        try:
            # Get open orders first
            open_orders_response = await self.trading_client.account.get_open_orders(
                market_names=[market_name] if market_name else None
            )
            
            open_orders = open_orders_response.data if hasattr(open_orders_response, 'data') else open_orders_response
            
            if not open_orders:
                return {"message": "No orders to cancel", "cancelled_count": 0}
            
            # Cancel orders individually using real SDK methods
            cancelled_orders = []
            for order in open_orders:
                try:
                    if hasattr(self.trading_client, 'cancel_order'):
                        cancel_result = await self.trading_client.cancel_order(order_id=int(order.id))
                        cancelled_orders.append(order.id)
                    else:
                        # If no cancel method exists, we can't cancel orders via SDK
                        break
                except Exception as cancel_error:
                    # Continue with other orders even if one fails
                    continue
            
            return {"cancelled_orders": cancelled_orders, "cancelled_count": len(cancelled_orders)}
            
        except Exception as e:
            return {"error": f"Failed to cancel all orders: {str(e)}"}
    
    async def close_position(self, market_name: str, percentage: float = 100.0) -> Dict[str, Any]:
        """Close a position DIRECTLY using the SDK - Returns ONLY raw data"""
        if not SDK_AVAILABLE or not self.trading_client:
            return {"error": "SDK not available or trading client not initialized"}
            
        try:
            # Get current position
            positions = await self.get_positions()
            
            if isinstance(positions, dict) and positions.get("error"):
                return positions
            
            position = next((p for p in positions if p.get('market_name') == market_name), None)
            
            if not position:
                return {"error": f"No position found for market {market_name}"}
            
            # Calculate amount to close
            position_size = Decimal(str(position.get('size', 0)))
            close_amount = position_size * Decimal(str(percentage / 100.0))
            
            # Determine opposite side
            current_side = position.get('side', 'LONG')
            close_side = "SELL" if current_side == "LONG" else "BUY"
            
            # Close using market order - this now returns only raw data
            close_response = await self.place_order(
                market_name=market_name,
                side=close_side,
                amount=str(close_amount),
                price="0",  # Market order
                order_type="MARKET"
            )
            
            # Return ONLY the raw data from place_order
            return close_response
            
        except Exception as e:
            return {"error": f"Failed to close position: {str(e)}"}
    
    async def get_orderbook(self, market_name: str) -> Dict[str, Any]:
        """Get orderbook from SDK - Returns ONLY raw data"""
        if not SDK_AVAILABLE or not self.data_client:
            return {"error": "SDK not available or data client not initialized"}
            
        try:
            orderbook_response = await self.data_client.get_orderbook(market_name)
            orderbook = orderbook_response.data if hasattr(orderbook_response, 'data') else orderbook_response
            
            # Return ONLY raw data without any wrapper
            return self._serialize_object(orderbook)
        except Exception as e:
            return {"error": f"Failed to get orderbook: {str(e)}"}
    
    async def get_trades(self, market_name: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get trades from SDK - Returns ONLY raw data"""
        if not SDK_AVAILABLE or not self.data_client:
            return {"error": "SDK not available or data client not initialized"}
            
        try:
            trades_response = await self.data_client.get_trades(market_name, limit=limit)
            trades = trades_response.data if hasattr(trades_response, 'data') else trades_response
            
            # Return ONLY raw data without any wrapper
            return [self._serialize_object(trade) for trade in trades]
        except Exception as e:
            return {"error": f"Failed to get trades: {str(e)}"}
    
    async def withdraw(self, amount: str, stark_address: str = None) -> Dict[str, Any]:
        """Submit a Starknet withdrawal request using the Extended SDK - Returns withdrawal ID
        
        For Starknet withdrawals:
        - amount: withdrawal amount in collateral asset (required)
        - stark_address: recipient Starknet address (OPTIONAL - uses account default if not provided)
        
        Returns withdrawal_id assigned by Extended on success
        """
        if not SDK_AVAILABLE or not self.trading_client:
            return {"error": "SDK not available or trading client not initialized"}
            
        try:
            from decimal import Decimal
            
            # Convert amount to Decimal for SDK
            withdrawal_amount = Decimal(str(amount))
            
            # Prepare withdrawal parameters for Starknet
            withdrawal_params = {
                "amount": withdrawal_amount,
                "chain_id": "STRK"
            }
            
            # Add optional Starknet address if provided
            if stark_address:
                withdrawal_params["stark_address"] = stark_address
            
            # Submit withdrawal via SDK account module
            withdrawal_response = await self.trading_client.account.withdraw(**withdrawal_params)
            
            # The SDK returns WrappedApiResponse[int] where .data contains the withdrawal ID
            withdrawal_id = withdrawal_response.data
            
            # Return the withdrawal data in the expected format
            return {
                "withdrawal_id": withdrawal_id,
                "amount": str(withdrawal_amount),
                "stark_address": stark_address,
                "status": "submitted"
            }
            
        except Exception as e:
            return {"error": f"Failed to submit withdrawal: {str(e)}"}
    
    async def get_bridge_config(self) -> Dict[str, Any]:
        """Get bridge configuration for EVM withdrawals - Returns ONLY raw data"""
        if not SDK_AVAILABLE or not self.trading_client:
            return {"error": "SDK not available or trading client not initialized"}
            
        try:
            bridge_config_response = await self.trading_client.account.get_bridge_config()
            bridge_config = bridge_config_response.data if hasattr(bridge_config_response, 'data') else bridge_config_response
            
            # Return ONLY raw data without any wrapper
            return self._serialize_object(bridge_config)
        except Exception as e:
            return {"error": f"Failed to get bridge config: {str(e)}"}
    
    async def get_bridge_quote(self, chain_in: str, chain_out: str, amount: str) -> Dict[str, Any]:
        """Get a bridge quote for EVM withdrawals - Returns ONLY raw data"""
        if not SDK_AVAILABLE or not self.trading_client:
            return {"error": "SDK not available or trading client not initialized"}
            
        try:
            from decimal import Decimal
            
            # Convert amount to Decimal for SDK
            quote_amount = Decimal(str(amount))
            
            # Get bridge quote via SDK
            quote_response = await self.trading_client.account.get_bridge_quote(
                chain_in=chain_in,
                chain_out=chain_out,
                amount=quote_amount
            )
            
            quote = quote_response.data if hasattr(quote_response, 'data') else quote_response
            
            # Return ONLY raw data without any wrapper
            return self._serialize_object(quote)
        except Exception as e:
            return {"error": f"Failed to get bridge quote: {str(e)}"}
    
    async def commit_bridge_quote(self, quote_id: str) -> Dict[str, Any]:
        """Commit a bridge quote for EVM withdrawals - Returns ONLY raw data"""
        if not SDK_AVAILABLE or not self.trading_client:
            return {"error": "SDK not available or trading client not initialized"}
            
        try:
            # Commit bridge quote via SDK
            await self.trading_client.account.commit_bridge_quote(id=quote_id)
            
            return {
                "success": True,
                "message": "Bridge quote committed successfully",
                "quote_id": quote_id
            }
        except Exception as e:
            return {"error": f"Failed to commit bridge quote: {str(e)}"}
    
    def get_stark_public_key(self, private_key: str) -> str:
        """Generate StarkNet public key (utility function)"""
        private_key_int = int(private_key, 16) if isinstance(private_key, str) else private_key
        public_key = get_public_key(private_key_int)
        return hex(public_key)


def main():
    """Main function to handle commands from Node.js - USES SDK DIRECTLY!"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided"}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        # Asynchronous commands that use the complete SDK
        if command in ["get_markets", "get_account_info", "get_positions", "get_orders", "get_order_by_id",
                      "place_order", "cancel_order", "cancel_order_by_external_id", "cancel_all_orders", "close_position",
                      "get_orderbook", "get_trades", "withdraw", "get_bridge_config", "get_bridge_quote", 
                      "commit_bridge_quote", "test_params"]:
            
            args = json.loads(sys.argv[2])
            
            service = ExtendedTradingService(
                api_key=args["api_key"],
                private_key=args["private_key"],
                public_key=args["public_key"],
                vault=args["vault"],
                environment=args.get("environment", "testnet")
            )
            
            # Execute the correct command
            async def run_command():
                if command == "get_markets":
                    return await service.get_markets()
                elif command == "get_account_info":
                    return await service.get_account_info()
                elif command == "get_positions":
                    return await service.get_positions()
                elif command == "get_orders":
                    return await service.get_orders(args.get("market_name"))
                elif command == "get_order_by_id":
                    return await service.get_order_by_id(args["order_id"])
                elif command == "place_order":
                    return await service.place_order(
                        market_name=args["market_name"],
                        side=args["side"],
                        amount=args["amount"],
                        price=args["price"],
                        order_type=args.get("order_type", "LIMIT"),
                        time_in_force=args.get("time_in_force", "GTC"),
                        post_only=args.get("post_only", False),  # ✅ Add post_only parameter
                        reduce_only=args.get("reduce_only", False)  # ✅ Add reduce_only parameter
                    )
                elif command == "cancel_order":
                    return service.cancel_order(args["external_id"])
                elif command == "cancel_order_by_external_id":
                    return await service.cancel_order_by_external_id(args["external_id"])
                elif command == "cancel_all_orders":
                    return await service.cancel_all_orders(args.get("market_name"))
                elif command == "close_position":
                    return await service.close_position(
                        market_name=args["market_name"],
                        percentage=args.get("percentage", 100.0)
                    )
                elif command == "get_orderbook":
                    return await service.get_orderbook(args["market_name"])
                elif command == "get_trades":
                    return await service.get_trades(
                        market_name=args["market_name"],
                        limit=args.get("limit", 50)
                    )
                elif command == "withdraw":
                    return await service.withdraw(
                        amount=args["amount"],
                        stark_address=args.get("stark_address")
                    )
                elif command == "get_bridge_config":
                    return await service.get_bridge_config()
                elif command == "get_bridge_quote":
                    return await service.get_bridge_quote(
                        chain_in=args["chain_in"],
                        chain_out=args["chain_out"],
                        amount=args["amount"]
                    )
                elif command == "commit_bridge_quote":
                    return await service.commit_bridge_quote(args["quote_id"])
                elif command == "test_params":
                    # Test command to verify parameters are passed correctly
                    return {
                        "success": True,
                        "message": "Parameters received correctly",
                        "received_params": {
                            "api_key": "***MASKED***" if args.get("api_key") else None,
                            "private_key": "***MASKED***" if args.get("private_key") else None,
                            "public_key": args.get("public_key"),
                            "vault": args.get("vault"),
                            "environment": args.get("environment"),
                            "test_param": args.get("test_param"),
                            "timestamp": args.get("timestamp"),
                            "all_args_keys": list(args.keys())
                        },
                        "service_config": {
                            "sdk_available": SDK_AVAILABLE,
                            "trading_client_initialized": service.trading_client is not None,
                            "data_client_initialized": service.data_client is not None
                        }
                    }
            
            # Execute asynchronous command
            result = asyncio.run(run_command())
            print(json.dumps(result))
            
        elif command == "get_public_key":
            # Synchronous command for utility
            args = json.loads(sys.argv[2])
            
            service = ExtendedTradingService(
                api_key="dummy",
                private_key=args["private_key"],
                public_key="dummy",
                vault=0
            )
            
            public_key = service.get_stark_public_key(args["private_key"])
            
            result = {
                "starkKey": public_key
            }
            
            print(json.dumps(result))
            
        else:
            print(json.dumps({"error": f"Unknown command: {command}"}))
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
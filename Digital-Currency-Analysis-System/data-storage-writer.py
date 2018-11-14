import argparse
import atexit
import json
import happybase
import logging

from kafka import KafkaConsumer
# from kafka.errors import KafkaError

logger_format = '%(asctime)s - %(message)s'
logging.basicConfig(format=logger_format)
logger = logging.getLogger('data-storage-writer')
logger.setLevel(logging.DEBUG)

def shutdown_hook(kafka_consumer, hbase_connection):
	"""
	A shutdown hook to be called before the shutdown.
	"""
	try:
		kafka_consumer.close()
		hbase_connection.close()
	except Exception as e:
		logger.warn('Failed to close kafka consumer or hbase connection for %s', e)


# IF row key is Symbol, multiple version in one cell
# 					family:price
# BTC-USD 			6000 timestamp1
#   				6100 timestamp2

# Else if row key-Symbol, column-timestamp does not make sense because of resource wasting

# OR(timestamp as row)			family:price
# BTC-USD:timestamp1             6000
# BTC_USD:timestamp2			 6100


def persist_data(data, hbase_connection, data_table):
	"""
	Persist data into hbase
	"""
	try:
		logger.debug('Start to persist data to hbase: %s', data)
		parsed = json.loads(data)
		symbol = parsed.get('Symbol')
		price = parsed.get('LastTradePrice')
		timestamp = parsed.get('Timestamp')

		table = hbase_connection.table(data_table)
		row_key = "%s-%s" % (symbol, timestamp)
		table.put(row_key, {'family:symbol': symbol,
							'family:trade_time':timestamp,
							'family:trade_price':price})
		logger.info('Persistend data to hbase for symbol: %s, price: %s, timestamp: %s', symbol, price, timestamp)

	except Exception as e:
		logger.error('Failed to persist data to hbase for %s', e)


if __name__ == '__main__':
	parser = argparse.ArgumentParser()
	parser.add_argument('topic_name')
	parser.add_argument('kafka_broker')
	parser.add_argument('data_table')
	parser.add_argument('hbase_host')

	# Parse arguments.
	args = parser.parse_args()
	topic_name = args.topic_name
	kafka_broker = args.kafka_broker
	data_table = args.data_table
	hbase_host = args.hbase_host

	# Initiate a simple kafka consumer
	kafka_consumer = KafkaConsumer(topic_name, bootstrap_servers=kafka_broker)

	# Initiate a hbase connection.
	hbase_connection = happybase.Connection(hbase_host)

	# When running for the first time, create table if not exists in hbase connection
	hbase_tables = [table.decode() for table in hbase_connection.tables()]
	if data_table not in hbase_tables:
		hbase_connection.create_table(data_table, {'family': dict()})

	# Setup proper shutdown hook to release resources when exit abnormally.
	atexit.register(shutdown_hook, kafka_consumer, hbase_connection)

	# Start consuming kafka and writing to hbase.
	for msg in kafka_consumer:
		persist_data(msg.value, hbase_connection, data_table)


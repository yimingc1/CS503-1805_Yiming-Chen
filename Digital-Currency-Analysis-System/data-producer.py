import argparse 
# help to release connection resource
import atexit
import json
# print log info
import logging
# help to invoke external API
import requests
# control the interval for calling the API
import schedule
import time

from kafka import KafkaProducer
from kafka.errors import KafkaError

# add the timestamp "system timestamp - messages"
logger_format = "%(asctime)s - %(message)s"
logging.basicConfig(format=logger_format)

# create a instance of logging and set the detail level for logging
logger = logging.getLogger('data-producer')
logger.setLevel(logging.DEBUG)

API_BASE = 'https://api.gdax.com'

def check_symbol(symbol):
	"""
	Helper method checks if the symbol exists in coinbase API.
	"""
	logger.debug('Checking symbol')
	try:
		response = requests.get(API_BASE + '/products')
		product_ids = [product['id'] for product in response.json()]

		if symbol not in product_ids:
			logger.warn('symbol %s not supported. The list of supported symbols: %s', symbol, product_ids)
			exit()

	except Exception as e:
		logger.warn('Failed to fetch products: %s', e)



def fetch_price(symbol, producer, topic_name):
	"""
	Helper function to retrieve data and send it to kafka.
	"""
	logger.debug('Start to fetch prices for %s', symbol)
	try:
		response = requests.get('%s/products/%s/ticker' % (API_BASE, symbol))
		price = response.json()['price']

		timestamp = time.time()
		payload = {
			'Symbol':str(symbol),
			'LastTradePrice':str(price),
			'Timestamp':str(timestamp)
		}

		logger.debug('Retrieved %s info %s', symbol, payload)
		producer.send(topic=topic_name, value=json.dumps(payload).encode('utf-8'))
		logger.debug('Sent price for %s to kafka', symbol)
	except Exception as e:
		logger.warn('Failed to fetch price: %s', e)



def shutdown_hook(producer):
	try:
		producer.flush(10)
	except KafkaError as kafka_error:
		logger.warn('Failed to flush pending messages to kafka, caused by: %s', kafka_error.message)
	finally:
		try:
			producer.close(10)
		except Exception as e:
			logger.warn('Failed to close kafka connection, cased by %s', e.message)	


# check whether this file is directly executed or imported. only run when is directly executed.
if __name__ == '__main__':
	parser = argparse.ArgumentParser();
	# not only for bit coin, using 'symbol' to switch
	parser.add_argument('symbol', help='the symbol you want to pull.')
	parser.add_argument('topic_name', help='the kafka topic push to.')
	parser.add_argument('kafka_broker', help='the location of kafka broker.')	

	# Parse arguments.
	args = parser.parse_args()
	symbol = args.symbol
	topic_name = args.topic_name
	kafka_broker = args.kafka_broker

	# Check if the symbol is supported
	check_symbol(symbol)

	# Instantiate a simple kafka producer
	producer = KafkaProducer(bootstrap_servers=kafka_broker)

	# Schedule and run the fetch_price function every one second.
	schedule.every(1).seconds.do(fetch_price, symbol, producer, topic_name)

	# Setup propper shutdown hook.
	atexit.register(shutdown_hook, producer)


while True:
		# there is no need to check every 1 sec
		schedule.run_pending()
		time.sleep(1)





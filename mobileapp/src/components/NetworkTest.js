import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

const NetworkTest = () => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState('');

  const testNetwork = async () => {
    setTesting(true);
    setResult('Testing network...');
    
    try {
      // Test simple HTTP request
      const response = await fetch('https://httpbin.org/json', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        setResult('✅ Basic internet connection works');
        
        // Now test your API
        const apiResponse = await fetch('https://myfinapp-594349697203.europe-west1.run.app/');
        if (apiResponse.ok) {
          const data = await apiResponse.json();
          setResult(`✅ API works! Got ${Object.keys(data).length} data fields`);
        } else {
          setResult(`❌ API failed: ${apiResponse.status}`);
        }
      } else {
        setResult('❌ No internet connection');
      }
    } catch (error) {
      setResult(`❌ Network error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Network Test</Text>
      <TouchableOpacity 
        style={[styles.button, testing && styles.buttonDisabled]}
        onPress={testNetwork}
        disabled={testing}
      >
        <Text style={styles.buttonText}>
          {testing ? 'Testing...' : 'Test Network'}
        </Text>
      </TouchableOpacity>
      <Text style={styles.result}>{result}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    margin: 10,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  result: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
});

export default NetworkTest; 
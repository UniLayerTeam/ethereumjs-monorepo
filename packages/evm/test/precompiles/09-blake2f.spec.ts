import { Chain, Common, Hardfork } from '@ethereumjs/common'
import { Address, bytesToHex, hexToBytes } from '@ethereumjs/util'
import { assert, beforeAll, describe, it } from 'vitest'

import { EVM, getActivePrecompiles } from '../../src/index.js'

import type { PrecompileFunc } from '../../src/precompiles/types.js'

const validCases = [
  {
    input:
      '0000000048c9bdf267e6096a3ba7ca8485ae67bb2bf894fe72f36e3cf1361d5f3af54fa5d182e6ad7f520e511f6c3e2b8c68059b6bbd41fbabd9831f79217e1319cde05b61626300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000001',
    expected:
      '08c9bcf367e6096a3ba7ca8485ae67bb2bf894fe72f36e3cf1361d5f3af54fa5d282e6ad7f520e511f6c3e2b8c68059b9442be0454267ce079217e1319cde05b',
    name: 'vector 4',
    gas: 0,
  },
  {
    input:
      '0000000c48c9bdf267e6096a3ba7ca8485ae67bb2bf894fe72f36e3cf1361d5f3af54fa5d182e6ad7f520e511f6c3e2b8c68059b6bbd41fbabd9831f79217e1319cde05b61626300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000001',
    expected:
      'ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923',
    name: 'vector 5',
    gas: 12,
  },
  {
    input:
      '0000000c48c9bdf267e6096a3ba7ca8485ae67bb2bf894fe72f36e3cf1361d5f3af54fa5d182e6ad7f520e511f6c3e2b8c68059b6bbd41fbabd9831f79217e1319cde05b61626300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000',
    expected:
      '75ab69d3190a562c51aef8d88f1c2775876944407270c42c9844252c26d2875298743e7f6d5ea2f2d3e8d226039cd31b4e426ac4f2d3d666a610c2116fde4735',
    name: 'vector 6',
    gas: 12,
  },
  {
    input:
      '0000000148c9bdf267e6096a3ba7ca8485ae67bb2bf894fe72f36e3cf1361d5f3af54fa5d182e6ad7f520e511f6c3e2b8c68059b6bbd41fbabd9831f79217e1319cde05b61626300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000001',
    expected:
      'b63a380cb2897d521994a85234ee2c181b5f844d2c624c002677e9703449d2fba551b3a8333bcdf5f2f7e08993d53923de3d64fcc68c034e717b9293fed7a421',
    name: 'vector 7',
    gas: 1,
  },
  {
    input:
      '007A120048c9bdf267e6096a3ba7ca8485ae67bb2bf894fe72f36e3cf1361d5f3af54fa5d182e6ad7f520e511f6c3e2b8c68059b6bbd41fbabd9831f79217e1319cde05b61626300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000001',
    expected:
      '6d2ce9e534d50e18ff866ae92d70cceba79bbcd14c63819fe48752c8aca87a4bb7dcc230d22a4047f0486cfcfb50a17b24b2899eb8fca370f22240adb5170189',
    name: 'vector 8',
    gas: 8000000,
  },
]

const malformedCases = [
  {
    input: '',
    expectedError: 'value out of range',
    name: 'vector 0: empty input',
  },
  {
    input:
      '00000c48c9bdf267e6096a3ba7ca8485ae67bb2bf894fe72f36e3cf1361d5f3af54fa5d182e6ad7f520e511f6c3e2b8c68059b6bbd41fbabd9831f79217e1319cde05b61626300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000001',
    expectedError: 'value out of range',
    name: 'vector 1: less than 213 bytes input',
  },
  {
    input:
      '000000000c48c9bdf267e6096a3ba7ca8485ae67bb2bf894fe72f36e3cf1361d5f3af54fa5d182e6ad7f520e511f6c3e2b8c68059b6bbd41fbabd9831f79217e1319cde05b61626300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000001',
    expectedError: 'value out of range',
    name: 'vector 2: more than 213 bytes input',
  },
  {
    input:
      '0000000c48c9bdf267e6096a3ba7ca8485ae67bb2bf894fe72f36e3cf1361d5f3af54fa5d182e6ad7f520e511f6c3e2b8c68059b6bbd41fbabd9831f79217e1319cde05b61626300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000002',
    expectedError: 'value out of range',
    name: 'vector 3: incorrect final block indicator flag',
  },
]

describe('Precompiles: BLAKE2F', () => {
  let evm: EVM
  let common: Common
  let addressStr: string
  let BLAKE2F: PrecompileFunc
  beforeAll(async () => {
    common = new Common({ chain: Chain.Mainnet, hardfork: Hardfork.Istanbul })
    // Test references: https://github.com/ethereum/go-ethereum/blob/e206d3f8975bd98cc86d14055dca40f996bacc60/core/vm/testdata/precompiles/blake2F.json
    //                  https://github.com/ethereum/go-ethereum/blob/e206d3f8975bd98cc86d14055dca40f996bacc60/core/vm/contracts_test.go#L73

    evm = await EVM.create({
      common,
    })
    addressStr = '0000000000000000000000000000000000000009'
    BLAKE2F = getActivePrecompiles(common).get(addressStr)!
  })

  for (const t of validCases) {
    it(`BLAKE2F valid cases: ${t.name}`, async () => {
      const data = hexToBytes(`0x${t.input}`)
      const result = await BLAKE2F({
        data,
        gasLimit: BigInt(0xffffff),
        common,
        _EVM: evm,
      })
      assert.equal(
        bytesToHex(result.returnValue),
        `0x${t.expected}`,
        'should generate expected value'
      )
      assert.deepEqual(result.executionGasUsed, BigInt(t.gas), 'should use expected amount of gas')
    })
  }

  for (const t of malformedCases) {
    it(`BLAKE2F malformed cases: ${t.name}`, async () => {
      const data = hexToBytes(`0x${t.input}`)
      const result = await BLAKE2F({
        data,
        gasLimit: BigInt(0xffff),
        common,
        _EVM: evm,
      })
      assert.equal(result.exceptionError!.error, t.expectedError, 'should generate expected error')
    })
  }

  it('should also work on non-zero aligned inputs', async () => {
    const addr = Address.zero()
    // Blake2f calldata from https://etherscan.io/tx/0x4f2e13a0a3f14033630ab2b8cdad09d316826375f761ded5b31253bb42e0a476
    // (This tx calls into Blake2f multiple times, but one of them is taken)
    const calldata =
      '0x0000000c28c9bdf267e6096a3ba7ca8485ae67bb2bf894fe72f36e3cf1361d5f3af54fa5d182e6ad7f520e511f6c3e2b8c68059b3dd8338ed89de6791854126751ac933302810c04147014e9eb472e4dbc09d3c96abb531c9ae39c9e6c454cb83913d688795e237837d30258d11ea7c75201003000454cb83913d688795e237837d30258d11ea7c752011af5b8015c64d39ab44c60ead8317f9f5a9b6c4c01000000000100ca9a3b000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000'

    // This code:
    // -> Copies the CALLDATA into memory, but at offset 0x20 (32)
    // -> Calls Blake2F with this data (so, with the calldata)
    // -> Returns the data from Blake2F
    const code = `0x366000602037600080366020600060095AF1593D6000593E3D90F3`
    await evm.stateManager.putContractCode(addr, hexToBytes(code))

    const res = await evm.runCall({
      data: hexToBytes(calldata),
      to: addr,
    })

    /*
      Note: this value is retrieved from infura by calling directly into Blake2F with the above `calldata`:

        curl https://mainnet.infura.io/v3/API_KEY_HERE \
          -X POST \
          -H "Content-Type: application/json" \
          -d '{"jsonrpc":"2.0","method":"eth_call","params": [{"to": "0x0000000000000000000000000000000000000009","data": "0x0000000c28c9bdf267e6096a3ba7ca8485ae67bb2bf894fe72f36e3cf1361d5f3af54fa5d182e6ad7f520e511f6c3e2b8c68059b3dd8338ed89de6791854126751ac933302810c04147014e9eb472e4dbc09d3c96abb531c9ae39c9e6c454cb83913d688795e237837d30258d11ea7c75201003000454cb83913d688795e237837d30258d11ea7c752011af5b8015c64d39ab44c60ead8317f9f5a9b6c4c01000000000100ca9a3b000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000"}, "latest"],"id":1}'
    */

    const expected =
      '0x772acbd3f30b0c3f5f53e8b836ab406f7d8d46fd4b27e2ce2ecd67dbf18c958741e2c49d1f1b1a463907a484f970c057dab9684062b82fda69e8a0057e14766f'

    assert.equal(bytesToHex(res.execResult.returnValue), expected)
  })
})

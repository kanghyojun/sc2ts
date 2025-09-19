typeinfos는 SC2 Replay MPQ 파일안에 바이너리로 저장되어있는 데이터에 대한 정보를 데이터로 어떻게 디코드할것지에 대한 타입 정보를 가지고 있음.
다음과 같은 규칙으로 타입을 정의하는것 같음

- `type` 필드는 타입의 종류를 나타냄. `args`는 해당 타입에 대한 추가 정보를 담고 있음.
- `typeinfos` 변수 내에서 배열내의 위치가 포인터 역할을 함. typeid로 사용됨. 예를 들면 `replay_header_typeid`는 18인데, `typeinfos[18]`에 위치한 `_struct` 타입의 정보가 디코딩는 것을 의미함.
- `args`는 `type` 필드에 따라서 각 다른 의미를 가지고 있으므로 각 타입 규칙에 따라서 해석해야함.

## `type` 필드에 따른 해석 방법

이 문서에서 예시로 사용하고 있는 데이터는 `src/protocol/versions/protocol80949.ts`에 정의된 `typeinfos`이다.

### `_int`

정수형 데이터.  `args[0][1]`이 비트 사이즈를 알려주기 때문에 64비트면 bigint, 아니면 number로 처리.

예시

- `typeinfos[0]`: 7비트짜리 정수를 표현함. TypeScript에서 `number` 타입과 동일함.
- `typeinfos[32]`: 64비트짜리 정수를 표현함. TypeScript에서 `bigint` 타입과 동일함.

### `_choice`

enum 데이터.

- `args[0][0]`이 enum의 최대 가지수를 알려주고 있음. `args[0][0][1]`이 비트 사이즈를 알려줌.
- `args[0][1]`은 enum의 모든 필드와 그 필드의 타입을 알려줌. `args[0][1][0]`이 필드의 이름, `args[0][1][1]`이 필드의 typeid임. 필드의 타입을 알기위해선 이 typeid를 따라가서 타입을 살펴봐야함.
- 그 결과값은 선택된 필드의 typeid에 따라 달라지므로 TypeScript의 합 타입으로 표현해야함.

예시

`typeinfos[7]`은 `[0, 2]` 크기의 enum 필드를 정의하므로 2비트를 사용해 0~4까지 enum  필드를 정의할 수 있음.
선택할 수 있는 필드는 `m_uint6`, `m_uint14`, `m_uint22`, `m_uint32` 중 하나임. `m_uint6`의 typeid는 3인데,
`typeinfo[3]`이 6비트짜리 정수형 데이터이므로, `m_uint6` 필드는 `number` 타입이 될것임. 동일한 조건으로 나머지 필드까지 해석하면
`typeinfos[7]`의 TypeScript 타입은 아래 타입처럼 정의됨.

```ts
type TypeInfo7 = { m_uint6: number; } | { m_uint14: number; } | { m_uint22: number; } | { m_uint32: number; };
```

### _struct

구조체 데이터. `args[0][0]`에 배열 안에 들어가있는 데이터들이 `[필드 이름, typeid, 바이너리 파일에서 순서]`로 이뤄져있음.
TypeScript의 `interface`로 해석됨. 각 필드 타입은 typeid를 따라가서 타입을 살펴봐야함.

예시

`typeinfos[11]`은 `m_flags`, `m_major`, `m_minor`, `m_revision`, `m_build`, `m_baseBuild` 필드가 있는 구조체임. 
`m_flags`의 typeid는 10이므로, `typeinfos[10]`의 정보를 찾아봐야하고, 8비트짜리 정수형 데이터니까 `number` 타입이될것.
동일한 조건으로 나머지 필드의 타입을 해석하면 아래와 같은 TypeScript 타입으로 정의됨.

```ts
interface TypeInfo11 {
    m_flags: number;
    m_major: number;
    m_minor: number;
    m_revision: number;
    m_build: number;
    m_baseBuild: number;
}
```

### _blob

바이너리 데이터. `args[0][1]`이 데이터의 크기를 나타냄. TypeScript의 `Buffer`타입과 동일함.

### _array

배열 데이터. `args[0][0]`이 배열의 크기를 `args[0][1]`은 typeid임. 배열의 타입을 알기 위해서 typeid를 따라가서 타입을
살펴봐야함.

예시

`typeinfos[14]`는 `args[0][1]`이 10이므로 `typeinfos[10]`의 타입인 정수형 데이터 배열임. `number[]` 타입과 동일함.

### _optional

옵셔널 타입. 특정 값이 있을수도있고 없을 수 도 있을때 사용함. `args[0]`이 typeid를 나타냄.
`undefined`가 존재할 수 있는 합타입이라고 볼 수 있음.

예시

`typeinfos[17]`에 있는 `m_dataDeprecated` 필드는 typeid가 15, `typeinfos[15]`는 `_optional`이면서 typeid가 14임.
`typeinfos[14]`는 `number[]` 타입이므로 `typeinfos[17]`은 아래와 같이 정의함.

```ts
interface TypeInfo17a {
    m_dataDeprecated?: number[];
    m_data: Buffer;
}
```

`_struct` 타입의 필드의 값이`_optional` typeid를 가리기코 있다면 위와 같이 정의되어야 하지만 `_struct`가 아니라면
`undefined`와 합 타입으로 표현해야함. 만약 정수형 데이터를 typeid로 가리키고 있다면, 아래와 같은 티입이어야함.

```ts
type ExampleType = number | undefined;
```
### _bitarray

바이트 배열 데이터. `args[0][1]`에 배열 크기를 담고 있음. 배열 크기와 바이트 배열의 값을 같이 반환해서
`[number, Buffer]` 타입과 동일함.

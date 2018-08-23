# Oolong DSL

  Oolong is a domain specific language created to assist application development automation. It solve problems in application development lifecycle including data modeling, code generation, test generation and deployment.

##1. Types

### Basic Types

1. 	**int**[(digits)] [**unsigned**]
1. 	**number**[(totalDigits[, decimalDigits])] [**exact**]
1.	**bool**
1.	**text**[(length)] [**fixed**] [**untrim**]
1.	**binary**[(length)] [**fixed**]
1.	**datetime** [**date only**]|[**time only**]|[**year only**]|[**timestamp**]
1.	**json**
1.	**xml**
1.	**csv**
1.	**enum** - [ 'value1', 'value2', ... ]

### Builtin Derived Types

1.  `name : text(40)`
1.  `shortName : text(20)`
1.  `title : text(200)`
1.  `description : text`
1.  `tag : csv`
1.  `flag : bool`
1.  `id : name ~matches(/^[A-Za-z_]\w{2,39}$/)`
1.  `password : text(200)`
1.  `email : text(200) ~isEmail`
1.  `alpha : text ~isAlpha`
1.  `digits : text ~isNumeric`
1.  `alphaNumber : text ~isAlphanumeric`
1.  `phone : text(20) ~matches(/^((\+|00)\d+)?\d+(-\d+)?$/)`
1.  `money : number exact`
1.  `url : text(2000) ~isURL`
1.  `path : text(2000) ~isURL({allow_protocol_relative_urls: true})`
1.  `uuid : text(36) fixedLength ~isUUID`
1.  `ip : text(40) ~isIP`
1.  `object : json`

##2.  Type Definition

	type
      <type name> : (<basic type>|<type reference>) ~(<validator>|<array of validators>
      
    e.g.
    type
      id : name ~matches(/^[A-Za-z_]\w{2,39}$/)
      email : text(200) ~isEmail

##3. Entity Definition

	entity <entity name>
      <features>
      <fields>
      <indexes>
      <interface>

    <features>kmoi
    	with
          <feature1>
          <feature2>
    
    <fields>
    	has
          <field name>: [<type>] [optional|readOnly|writeOnceOnly|computed] [|<modifier>]
                  
##4. Relationship

	multi
    	a user may have several accessToken of its own for a client
    
    chain
    	a role may have several permission to several resource

##5. Schema

##6. View

### Detail View

    view <view name>
      is a <main entity name>[(...column list)]
      [with
        <joining entity name>[(...column list)] [as <*>|(<nested property name>.<*>)] [exist only]
      ]
      [accept
        <parameter name>:[<type, default value, validators, modifiers>]
        [...]
      ]
      [selected by
        <conditions>
        [ranking from <start offset> to <end offset>]
      ]

### List View

    view <view name>
      is a <main entity name>[(...column list)] list
      [with
        <joining entity name>[(...column list)] [as <*>|(<nested property name>.<*>)] [exist only]
      ]
      [accept
        <parameter name>:[<type, default value, validators, modifiers>]
        [...]
      ]
      [selected by
        <conditions>
        [ranking from <start offset> to <end offset>]
      ]
      [group by
        <field name>
      ]
      [order by
        <field name>
      ]

## License

  MIT
 

## Latest version

  1.0.6

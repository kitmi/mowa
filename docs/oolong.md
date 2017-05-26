# Oolong DSL

  Oolong is a domain specific language created to assist application development automation. It solve problems in application development lifecycle including data modeling, code generation, test generation and deployment.

##1. Basic Types

1. 	**int**[(digits)] [**unsigned**]
1. 	**number**[(totalDigits[, decimalDigits])] [**exact**]
1.	**bool**
1.	**text**[(length)] [**fixed**] [**untrim**]
1.	**binary**[(length)] [**fixed**]
1.	**datetime** [**date only**]|[**time only**]|[**year only**]|[**timestamp**]
1.	**json**
1.	**xml**
1.	**csv**
1.	*enum*

##2.  Type Definition

	type
      <type name> : (<basic type>|<type reference>) ~(<validator>|<array of validators>
      
    e.g.
    type
      id : name ~matches(/^[A-Za-z_]\w{2,39}$/)
      email : text(200) ~isEmail



## License

  MIT

## Latest version

  0.0.3

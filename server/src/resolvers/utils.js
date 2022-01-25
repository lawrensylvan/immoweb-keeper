const { parseResolveInfo } = require('graphql-parse-resolve-info')

function queryHasField(queryInfo, typeName, fieldName) {
    let tree = parseResolveInfo(queryInfo)
    return treeHasField(tree, typeName, fieldName)
}

function treeHasField(tree, typeName, fieldName) {
    const fieldsByTypeName = tree.fieldsByTypeName
    for(let type in fieldsByTypeName) {
        let fields = fieldsByTypeName[type]
        if(type === typeName) {
            return fields[fieldName] != null
        }
        for(const [,value] of Object.entries(fields)) {
            if(treeHasField(value, typeName, fieldName)) {
                return true
            }
        }
        return false 
    }
}

module.exports = { queryHasField }
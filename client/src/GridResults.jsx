import React, { useState } from 'react'
import { List, Card, Avatar, Pagination, Image, Skeleton, Popover } from 'antd'
import { CopyOutlined, EditOutlined, ExpandAltOutlined, HeartOutlined } from '@ant-design/icons'
import { CopyToClipboard } from 'react-copy-to-clipboard'

const ImageGallery = ({immowebCode, images}) => {
    const fullURLs = images.map(i => `http://localhost:5000/${immowebCode}/${i}`)
    const firstURL = fullURLs[0]
    const [visible, setVisible] = useState(false)
    
    return (
    <>
        <Image
            src={firstURL}
            placeholder={<Skeleton.Image style={{width:300, height:200}} />}
            preview={{visible: false}} 
            onClick={() => setVisible(true)}
            style={{height: '200px', objectFit: 'cover', overflow: 'hidden'}}
        />

        <div style={{display: 'none'}}>
            <Image.PreviewGroup preview={{ visible, onVisibleChange: v => setVisible(v) }}>
                {fullURLs.map(image => (
                    <Image src={image}/>
                ))}
            </Image.PreviewGroup>
        </div>
    </>
    )
}

export default function GridResults({estates}) {
    
    return (
        <div className='GridResults' >
            <List size="small" grid={{ gutter: 16, column: 4 }}
                pagination={<Pagination defaultPageSize={12} pageSize={12} showSizeChanger={false} simple={true} />}
                dataSource={estates} renderItem={estate => (
                    <List.Item>
                        <Card title={estate.displayPrice}  hoverable
                            cover={<ImageGallery immowebCode={estate.immowebCode} images={estate.images} />}
                            actions={[
                                <HeartOutlined key="heart" />,
                                <ExpandAltOutlined key="expand" />,
                                <EditOutlined key="edit" />,
                                <Popover trigger="hover" content={estate.immowebCode}>
                                    <CopyToClipboard text={estate.immowebCode}>
                                        <CopyOutlined key="copy" />
                                    </CopyToClipboard>
                                </Popover>
                                
                            ]}
                        >
                            <Card.Meta
                                avatar={<Avatar src="https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png" />}
                                title={estate.locality}
                                description={estate.displayCreationDate}
                            />
                        </Card>
                    </List.Item>
                )}
            />

        </div>
    )
}
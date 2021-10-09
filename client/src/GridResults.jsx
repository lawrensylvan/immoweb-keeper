import React, { useState } from 'react'
import { List, Card, Avatar, Pagination, Image, Button, Skeleton } from 'antd'
import { EditOutlined, ExpandAltOutlined, HeartOutlined } from '@ant-design/icons'

export default function GridResults({estates}) {
    
    const [random, setRandom] = React.useState()

    const ImageGallery = ({immowebCode, images}) => {
        const fullURLs = images.map(i => `http://localhost:5000/${immowebCode}/${i}`)
        const firstURL = fullURLs[0]
        const [visible, setVisible] = useState(false)
        
        return (
        <>
            <Image
                src={firstURL + '?random=' + random}
                placeholder={<Skeleton.Image style={{width:300, height:200}} />}
                preview={{visible: false}} 
                onClick={() => setVisible(true)}
                style={{height: '200px', objectFit: 'cover', overflow: 'hidden'}}
            />

            <div style={{display: 'none'}}>
                <Image.PreviewGroup preview={{ visible, onVisibleChange: v => setVisible(v) }}>
                    {fullURLs.map(image => (
                        <Image
                            src={image + '?random=' + random}
                        />
                    ))}
                </Image.PreviewGroup>
            </div>
        </>
        )
    }
    
    return (
        <div className='GridResults' >
            <Button
                type="primary"
                onClick={() => {
                setRandom(Date.now());
                }}
            >
                Reload
            </Button>
            <List size="small" grid={{ gutter: 16, column: 4 }}
                pagination={<Pagination defaultPageSize={12} pageSize={12} showSizeChanger={false} simple={true} />}
                dataSource={estates} renderItem={estate => (
                    <List.Item>
                        <Card title={estate.displayPrice}
                            cover={<ImageGallery immowebCode={estate.immowebCode} images={estate.images} />}
                            actions={[
                                <HeartOutlined key="heart" />,
                                <ExpandAltOutlined key="expand" />,
                                <EditOutlined key="edit" />,
                            ]}
                        >
                            <Card.Meta
                                avatar={<Avatar src="https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png" />}
                                title={estate.locality}
                                description="Il y a 3 jours"
                            />
                        </Card>
                    </List.Item>
                )}
            />

        </div>
    )
}
